# Implementation Plan: Lodestar AI Narratives

## Overview

This plan implements AI-generated delivery narratives for the WaypointPI Program Roadmap. The approach builds incrementally: database model first, then generation service, API integration, staleness/batch logic, and finally frontend UI updates. Each step wires into the existing codebase and validates with tests.

## Tasks

- [x] 1. Database model and migration
  - [x] 1.1 Create FeatureNarrative SQLAlchemy model in `app/models.py`
    - Add `FeatureNarrative` class with columns: `id`, `feature_issue_id` (FK to issue.id, unique), `narrative_text` (Text), `generated_at` (DateTime), `model_name` (String(100)), `is_stale` (Boolean, default False)
    - Add relationship to `Issue`
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 1.2 Create migration script `app/migrations/add_feature_narrative.py`
    - Create the `feature_narrative` table with proper indexes and constraints
    - Follow existing migration pattern from `add_roadmap_dates.py`
    - _Requirements: 1.1_

  - [x]* 1.3 Write property test for narrative persistence one-to-one invariant
    - **Property 1: Narrative persistence one-to-one invariant**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
    - Use Hypothesis to generate arbitrary sequences of upserts for the same feature_issue_id and verify at most one row exists with correct data

- [x] 2. Narrative Generator Service
  - [x] 2.1 Create `app/narrative.py` with context gathering logic
    - Implement `NarrativeContext` dataclass with fields: feature_key, feature_summary, completion_pct, blocker_count, sprint_velocity, recent_status_changes, team_name, days_remaining
    - Implement `gather_context(session, feature_issue_id, pi_id)` querying child stories, blocker links, sprint velocity (avg done over last 3 closed sprints), status changes in last 14 days, team name, and days remaining in PI
    - Use default of 0 for numeric fields and "unknown" for text fields when data is unavailable
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Implement prompt construction and LLM call in `app/narrative.py`
    - Implement `generate_narrative(session, feature_issue_id, pi_id)` pipeline
    - Build prompt including all gathered context fields
    - Call Azure OpenAI with `temperature=0.3`, `max_tokens=200`
    - Reuse `_get_openai_client` and `_call_with_retry` from `app/api/routers/enrich.py`
    - Implement `NarrativeResult` dataclass with narrative_text, generated_at, model_name
    - Persist result with upsert semantics (replace existing narrative for same feature)
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 1.3_

  - [x]* 2.3 Write property test for context computation correctness
    - **Property 3: Context computation correctness**
    - **Validates: Requirements 2.1, 2.2**
    - Use Hypothesis to generate varied story counts, statuses, and sprint data, verify completion_pct, blocker_count, and sprint_velocity computations

  - [x]* 2.4 Write property test for non-existent feature rejection
    - **Property 2: Non-existent feature rejection**
    - **Validates: Requirements 1.5, 4.6**
    - Use Hypothesis to generate arbitrary non-existent IDs and verify no row is inserted and error is returned

  - [x]* 2.5 Write unit tests for narrative generation
    - Test prompt includes all context fields
    - Test max_tokens=200 and temperature=0.3 are passed to OpenAI
    - Test upsert replaces existing narrative
    - Test 503 returned when AZURE_OPENAI_ENDPOINT not set
    - _Requirements: 2.3, 2.4, 2.5, 6.3_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Error handling and graceful degradation
  - [x] 4.1 Implement error taxonomy in `app/narrative.py`
    - Import and reuse `ProviderNotConfiguredError`, `ProviderAuthError`, `ProviderRateLimitError`, `ProviderTimeoutError`, `LLMParseError` from enrichment module
    - Add validation that LLM response is non-empty valid text before persisting
    - Ensure existing narrative is preserved on any generation failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x]* 4.2 Write property test for failure preserves existing narrative
    - **Property 6: Failure preserves existing narrative**
    - **Validates: Requirements 4.3, 6.2**
    - Use Hypothesis to simulate failures after persisting a narrative and verify original data is unchanged

  - [x]* 4.3 Write property test for invalid LLM response rejection
    - **Property 8: Invalid LLM response rejection**
    - **Validates: Requirements 6.5**
    - Use Hypothesis to generate empty/malformed responses and verify nothing is persisted and error is returned

- [x] 5. Narrative Router (API endpoints)
  - [x] 5.1 Create `app/api/routers/narrative.py` with on-demand generation endpoint
    - Implement `POST /api/features/{feature_key}/narrative/generate`
    - Look up feature by jira_key, determine PI from sprint membership
    - Call `generate_narrative`, return `{ narrative_text, generated_at }` JSON response
    - Return HTTP 404 if feature_key not found
    - Return HTTP 503 if Azure OpenAI not configured
    - _Requirements: 4.4, 4.5, 4.6, 6.3_

  - [x] 5.2 Add batch generation endpoint to narrative router
    - Implement `POST /api/pis/{pi}/narratives/generate`
    - Query all features in the specified PI
    - Process sequentially, collecting successes and failures
    - Return summary: `{ total, generated, failed, failures: [{feature_key, error}] }`
    - Continue on individual feature failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.3 Register narrative router in `app/api/main.py`
    - Import and include the narrative router
    - _Requirements: 4.4, 5.1_

  - [x]* 5.4 Write property test for batch generation accounting
    - **Property 7: Batch generation accounting**
    - **Validates: Requirements 5.3, 5.4**
    - Use Hypothesis to vary the number of features and mock LLM success/failure, verify generated + failed = total

  - [x]* 5.5 Write unit tests for narrative API endpoints
    - Test 404 for non-existent feature_key
    - Test 503 when Azure not configured
    - Test successful generation returns narrative_text and generated_at
    - Test batch endpoint returns correct summary structure
    - _Requirements: 4.4, 4.5, 4.6, 5.1, 5.3_

- [x] 6. API integration — serve narratives in FeatureItemOut
  - [x] 6.1 Add `generated_at` field to `FeatureItemOut` schema in `app/api/schemas.py`
    - Add `generated_at: Optional[str]` field (ISO 8601 UTC timestamp)
    - _Requirements: 3.4, 3.5_

  - [x] 6.2 Modify roadmap router to join `feature_narrative` table
    - Update `get_pi_features` in `app/api/routers/roadmap.py` to left-join `feature_narrative` on `feature_issue_id`
    - Populate `lodestar_static` with `narrative_text` (or null)
    - Populate `generated_at` with ISO 8601 formatted timestamp (or null)
    - No generation logic in this read path
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.3 Add Next.js API route proxy for narrative endpoints
    - Create `dashboard/app/api/features/[key]/narrative/generate/route.ts` proxying POST to FastAPI
    - Create `dashboard/app/api/pis/[pi]/narratives/generate/route.ts` proxying POST to FastAPI
    - _Requirements: 4.4, 5.1_

  - [x]* 6.4 Write property test for API narrative read-through
    - **Property 4: API narrative read-through**
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
    - Use Hypothesis to generate features with and without narratives, verify lodestar_static and generated_at match database values

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Staleness detection and background regeneration
  - [x] 8.1 Implement staleness marking in `app/narrative.py`
    - Implement `mark_stale(session, feature_issue_ids)` function
    - Set `is_stale = True` for narratives matching provided feature IDs
    - Return count of narratives marked stale
    - _Requirements: 4.1_

  - [x] 8.2 Implement sync-triggered staleness detection
    - After data sync completes, detect features whose data changed (completion percentage, blocker count, status_category, assignee)
    - Call `mark_stale` for affected features that have existing narratives
    - Enqueue background regeneration within 60 seconds using `threading.Timer` or `asyncio` task
    - On background failure: retain existing narrative, log error, do not retry
    - _Requirements: 4.1, 4.2, 4.3_

  - [x]* 8.3 Write property test for staleness detection correctness
    - **Property 5: Staleness detection correctness**
    - **Validates: Requirements 4.1**
    - Use Hypothesis to generate sets of changed vs unchanged features and verify only affected narratives are marked stale

  - [x]* 8.4 Write unit tests for staleness and background regeneration
    - Test mark_stale updates correct rows
    - Test background task triggers within timeout
    - Test failure preserves existing narrative and logs error
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Frontend — LodestarPanel regeneration UI
  - [x] 9.1 Update `FeatureItem` TypeScript type with `generated_at` field
    - Add `generated_at: string | null` to the `FeatureItem` type in `types/roadmap.ts`
    - _Requirements: 3.4, 3.5_

  - [x] 9.2 Implement `formatRelativeTime` utility function
    - Create `dashboard/lib/formatRelativeTime.ts`
    - Format UTC timestamp as relative time (e.g., "Generated 2 hours ago", "Generated just now")
    - Handle edge cases: future timestamps, very old timestamps
    - _Requirements: 9.6_

  - [x] 9.3 Extend `LodestarPanel` with Regenerate button and loading/error states
    - Add `featureKey` prop and optional `generatedAt` prop
    - Add "Regenerate" button adjacent to narrative text
    - On click: call `POST /api/features/{key}/narrative/generate`
    - Show loading indicator and disable button during request
    - On success: update displayed text and timestamp
    - On failure: show inline error message, re-enable button
    - Display `generated_at` as relative time below narrative
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 9.4 Update `DetailDrawer` to pass new props to `LodestarPanel`
    - Pass `featureKey` and `generatedAt` from the `feature` object
    - _Requirements: 9.1_

  - [x]* 9.5 Write property test for relative time formatting
    - **Property 9: Relative time formatting**
    - **Validates: Requirements 9.6**
    - Use fast-check to generate arbitrary timestamps and verify output is a valid human-readable relative time string

  - [x]* 9.6 Write frontend component tests for LodestarPanel
    - Test Regenerate button renders
    - Test button disabled during loading
    - Test error message displayed on failure
    - Test relative time formatting for various timestamps
    - Test narrative text updates on successful regeneration
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Requirement 8 (SSE Streaming) is marked as Phase 2 / Deferred in the requirements and is NOT included in this task list
- Backend uses Python (pytest + Hypothesis for property tests)
- Frontend uses TypeScript (Vitest + fast-check for property tests, React Testing Library for component tests)
- The `_get_openai_client` and `_call_with_retry` functions from the enrichment module are reused directly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "9.1", "9.2"] },
    { "id": 3, "tasks": ["2.2", "6.1"] },
    { "id": 4, "tasks": ["2.3", "2.4", "2.5", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.2"] },
    { "id": 7, "tasks": ["5.4", "5.5", "6.3"] },
    { "id": 8, "tasks": ["6.4", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3", "8.4"] },
    { "id": 10, "tasks": ["9.3"] },
    { "id": 11, "tasks": ["9.4", "9.5", "9.6"] }
  ]
}
```
