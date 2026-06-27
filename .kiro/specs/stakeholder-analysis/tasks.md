# Implementation Plan: Stakeholder Analysis

## Overview

This plan implements the Stakeholder Analysis feature end-to-end: backend package with FastAPI endpoints, SSE streaming orchestrator, 8 AI prompt templates, database models/migration, export service, and a full Next.js frontend with streaming consumption, visualization components, and navigation integration. Tasks are ordered so each step builds on prior work, with property-based and unit tests integrated close to the code they validate.

## Tasks

- [x] 1. Backend package structure, data models, and migration
  - [x] 1.1 Create `app/stakeholders/` package with `__init__.py`, `router.py`, `orchestrator.py`, `prompts.py`, `export.py` skeleton files
    - Create the directory and empty module files with docstrings
    - `__init__.py` should expose the router for registration in `app/api/main.py`
    - _Requirements: 2.1_

  - [x] 1.2 Implement SQLAlchemy models `AnalysisSession` and `AnalysisSectionResult`
    - Add both classes to `app/models.py` (or a new `app/stakeholders/models.py` imported into the existing models module)
    - Include all columns per design: id, filename, file_size_bytes, transcript_text, has_speaker_attribution, status, created_at, completed_at, prompt_version for sessions
    - Include id, session_id FK, section_key, status, result_text, error_message, generated_at, model_name for section results
    - Add UniqueConstraint on (session_id, section_key)
    - Add relationship between session and sections with cascade delete-orphan
    - _Requirements: 12.1, 12.4_

  - [x] 1.3 Create database migration `app/migrations/add_stakeholder_analysis.py`
    - Follow the existing migration pattern (see `add_feature_narrative.py`)
    - Create both `analysis_session` and `analysis_section_result` tables
    - _Requirements: 12.1_

- [x] 2. Upload endpoint and validation
  - [x] 2.1 Implement `POST /api/stakeholders/upload` endpoint in `router.py`
    - Accept multipart/form-data with a single file field
    - Validate file extension is `.txt` (return 415 if not)
    - Validate file size ≤ 5 MB (return 413 if exceeded)
    - Detect speaker attribution pattern (regex for `"Name: text"` lines)
    - Store transcript content, create `AnalysisSession` with status "pending"
    - Create 8 `AnalysisSectionResult` rows with status "pending"
    - Return `{ session_id, filename, warning }` where warning is set if no speaker attribution detected
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Write property tests for upload validation (Properties 1, 2)
    - **Property 1: Upload creates session with stored content** — For any valid .txt content (non-empty, ≤5MB), upload returns a session ID and transcript is retrievable identically from the database
    - **Property 2: Non-speaker text accepted with warning** — For any text without speaker attribution pattern, upload succeeds with a warning flag
    - **Validates: Requirements 1.3, 1.6**

  - [x] 2.3 Write unit tests for upload validation
    - Test file size rejection (>5MB)
    - Test format rejection (non-.txt)
    - Test speaker attribution regex detection
    - Test successful upload flow
    - _Requirements: 1.4, 1.5, 1.6_

- [x] 3. Prompt templates
  - [x] 3.1 Implement all 8 prompt templates in `app/stakeholders/prompts.py`
    - Define `STAKEHOLDER_PROMPT_VERSION = "v1.0"`
    - Define `SECTION_PROMPTS` dict with all 8 section keys mapped to prompt template strings
    - Each template follows the system/context/task/format structure from design
    - Implement `build_section_prompt(section: str, transcript: str) -> str` that injects transcript into the template
    - Include max_tokens config per section as specified in design
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 10.1, 10.2, 11.1, 11.2_

  - [x] 3.2 Write unit tests for prompt template rendering
    - Verify transcript injection into each template
    - Verify all 8 section keys are present
    - Verify prompt version is set
    - _Requirements: 2.1_

- [x] 4. Analysis orchestrator and SSE streaming
  - [x] 4.1 Implement `AnalysisOrchestrator` class in `app/stakeholders/orchestrator.py`
    - Define SECTIONS list with all 8 section keys
    - Implement `run_all()` async generator that runs all 8 sections in parallel via asyncio.TaskGroup
    - Implement `run_section()` async generator for single section execution
    - Use asyncio.Queue as fan-in point for multiplexing chunks from parallel sections
    - Yield SSE events: section_start, chunk, section_done, section_error, all_done
    - Implement per-section timeout (30s default, configurable via `STAKEHOLDER_STREAM_TIMEOUT_SECONDS` env var)
    - On section failure, continue processing remaining sections, mark failed section with error state
    - Persist section results to database on section_done
    - Update session status to "complete" when all sections finish
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1_

  - [x] 4.2 Implement SSE stream endpoint `GET /api/stakeholders/sessions/{session_id}/stream`
    - Use `EventSourceResponse` from `sse-starlette`
    - Instantiate orchestrator with the session's transcript and adapter
    - Stream multiplexed events from orchestrator
    - Handle client disconnect (cancel in-flight tasks, do NOT persist incomplete results)
    - _Requirements: 3.1, 3.3_

  - [x] 4.3 Write property test for fault-tolerant orchestration (Property 3)
    - **Property 3: Fault-tolerant orchestration** — For any subset of sections that raise exceptions, remaining sections complete successfully, failed sections have "error" status, session reaches terminal status
    - Mock adapter with random failures using hypothesis strategies
    - **Validates: Requirements 2.4, 2.5**

  - [x] 4.4 Write unit tests for SSE event serialization
    - Test JSON serialization of each event type (section_start, chunk, section_done, section_error, all_done)
    - Test event ordering invariants
    - _Requirements: 3.1, 3.3_

- [x] 5. Checkpoint - Ensure all backend core tests pass
  - All 95 stakeholder tests pass (unit, property, integration).

- [x] 6. Session CRUD endpoints
  - [x] 6.1 Implement session list, detail, and delete endpoints
    - `GET /api/stakeholders/sessions` — return list of sessions with id, filename, created_at, status
    - `GET /api/stakeholders/sessions/{session_id}` — return session detail with all section results
    - `DELETE /api/stakeholders/sessions/{session_id}` — delete session and cascade to section results
    - Return 404 for unknown session IDs
    - _Requirements: 12.2, 12.3, 12.4_

  - [x] 6.2 Write property test for session persistence round-trip (Property 12)
    - **Property 12: Session persistence round-trip** — For any completed session with N sections, retrieving by ID returns all N sections with identical result text, no LLM calls invoked
    - **Validates: Requirements 12.1, 12.3**

- [x] 7. Section regeneration endpoint
  - [x] 7.1 Implement `POST /api/stakeholders/sessions/{session_id}/sections/{section}/regenerate`
    - Validate session exists and section key is valid
    - Run single section prompt against stored transcript
    - Stream SSE events for that section only
    - On completion, replace previous section result in database
    - Show loading state only for the regenerated section
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 7.2 Write property test for section regeneration isolation (Property 13)
    - **Property 13: Section regeneration isolation** — Triggering regeneration invokes exactly one LLM prompt, updated section differs from previous value, all other sections remain unchanged
    - **Validates: Requirements 13.1, 13.2**

- [x] 8. Export service
  - [x] 8.1 Implement `ExportService` in `app/stakeholders/export.py`
    - `to_markdown()` method generates full Markdown document with metadata header (filename, date, section count) and all section results
    - Implement `GET /api/stakeholders/sessions/{session_id}/export?format=markdown` endpoint
    - Return as `text/markdown` file download with appropriate Content-Disposition header
    - _Requirements: 14.1, 14.3_

  - [x] 8.2 Write property test for export completeness (Property 14)
    - **Property 14: Export completeness** — For any completed session, exported Markdown contains filename, date, header for each of 8 sections, and full result text of every completed section
    - **Validates: Requirements 14.1, 14.3**

  - [x] 8.3 Write unit tests for export Markdown formatting
    - Test header generation with metadata
    - Test section ordering
    - Test handling of sections with error status (omitted or marked)
    - _Requirements: 14.1, 14.3_

- [x] 9. Register router in main application
  - [x] 9.1 Wire stakeholders router into `app/api/main.py`
    - Import and include the stakeholders router with prefix
    - Verify all endpoints are accessible
    - _Requirements: 2.1_

- [x] 10. Checkpoint - Ensure full backend integration works
  - All 95 stakeholder tests pass including integration tests.

- [x] 11. Frontend page scaffolding and navigation
  - [x] 11.1 Create `/stakeholders/page.tsx` with layout structure
    - Create `dashboard/app/stakeholders/page.tsx`
    - Implement `StakeholderAnalysisPage` component with sidebar + main content layout
    - Use Northline CSS custom properties for styling (inline styles with design tokens)
    - Ensure responsive layout for 768px–1920px viewports
    - _Requirements: 15.1, 16.1, 16.2, 16.3_

  - [x] 11.2 Add Stakeholder Analysis item to `AppSidebar` navigation
    - Add navigation entry with appropriate icon and "Stakeholder Analysis" label
    - Highlight when on `/stakeholders` route
    - Follow existing sidebar pattern (icon + label, active state styling)
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 12. TranscriptUploader component
  - [x] 12.1 Implement `TranscriptUploader` component
    - File input accepting `.txt` files only
    - Display selected file name and size before upload
    - Confirm button to trigger upload POST
    - Show inline error messages for validation failures (413, 415)
    - Show upload warning if backend returns warning about missing speaker attribution
    - Loading state during upload
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

- [x] 13. SSE streaming hook and section state management
  - [x] 13.1 Implement `useAnalysisStream` custom hook
    - Open EventSource to `/api/stakeholders/sessions/{sessionId}/stream`
    - Parse SSE events and route chunks to correct section by `section` field
    - Track per-section status: pending → streaming → complete | error
    - On `section_done` mark section complete
    - On `section_error` mark section error with message
    - On `all_done` close EventSource connection
    - On connection error, expose retry capability per-section
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 14. SectionPanel components
  - [x] 14.1 Implement generic `SectionPanel` component with streaming display
    - Render section header with title and regenerate button
    - Display streaming text incrementally during "streaming" status
    - Display full persisted result for "complete" status
    - Display error message with "Regenerate" button for "error" status
    - Display loading spinner for "pending" status
    - P1 delivery signals items get visual emphasis (bold/color)
    - _Requirements: 3.2, 3.3, 3.4, 7.3, 13.3_

- [x] 15. Specialized visualization components
  - [x] 15.1 Implement `EmpathyMapGrid` component
    - 6-quadrant grid layout (Thinks, Feels, Says, Does, Pains, Gains)
    - Display 1-2 stakeholder empathy maps
    - Use CSS Grid with labeled quadrants
    - Northline design tokens for colors and spacing
    - _Requirements: 10.2, 10.3, 16.1_

  - [x] 15.2 Implement `InfluenceMapQuadrant` component
    - 2×2 quadrant visualization (High Power/High Interest, High Power/Low Interest, Low Power/High Interest, Low Power/Low Interest)
    - Position stakeholder markers using Power/Interest coordinates
    - Label each quadrant
    - Northline design tokens for styling
    - _Requirements: 11.2, 11.3, 16.1_

- [x] 16. SessionHistory sidebar and ExportBar
  - [x] 16.1 Implement `SessionHistory` component
    - Fetch and display list of past sessions (filename, timestamp, status)
    - Click to load a past session's persisted results (no new AI generation)
    - Show active session highlighted
    - _Requirements: 12.2, 12.3_

  - [x] 16.2 Implement `ExportBar` component
    - "Export Markdown" button triggers download of full session export
    - Per-section "Copy" button copies section content to clipboard via `navigator.clipboard.writeText()`
    - Disable export buttons when session is incomplete
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 17. Checkpoint - Ensure frontend components render correctly
  - Frontend TypeScript compiles cleanly (no stakeholder-related errors).

- [x] 18. Property-based tests for analysis output validation
  - [x] 18.1 Write property test for speaker statistics summation (Property 4)
    - **Property 4: Speaker statistics summation invariant** — Sum of utterance counts equals total, sum of word counts equals total, sum of share-of-voice percentages equals 100% (±0.1%)
    - **Validates: Requirements 4.2**

  - [x] 18.2 Write property test for silent participant threshold (Property 5)
    - **Property 5: Silent participant threshold** — Every speaker with <5% share of voice appears in silent participants list, no speaker with ≥5% appears
    - **Validates: Requirements 4.4**

  - [x] 18.3 Write property test for concentration ratio bounds (Property 6)
    - **Property 6: Concentration ratio bounds** — Ratio is in [0.0, 1.0], for perfectly even distribution equals 1/N
    - **Validates: Requirements 4.5**

  - [x] 18.4 Write property test for RAID rating enum constraints (Property 7)
    - **Property 7: RAID rating enum constraints** — Every Risk/Issue has severity in {High, Medium, Low}, every Risk has probability in {High, Medium, Low}, every Dependency has impact in {High, Medium, Low}
    - **Validates: Requirements 6.2, 6.3, 6.4**

  - [x] 18.5 Write property test for priority tier completeness (Property 8)
    - **Property 8: Priority tier and action item completeness** — Every action item has priority in {P1, P2, P3}, non-empty description, and non-empty rationale
    - **Validates: Requirements 7.1, 7.2**

  - [x] 18.6 Write property test for team health score bounds (Property 9)
    - **Property 9: Team health score bounds** — Overall health score is an integer in [1, 10]
    - **Validates: Requirements 8.5**

  - [x] 18.7 Write property test for empathy map quadrant completeness (Property 10)
    - **Property 10: Empathy map quadrant completeness** — Each stakeholder map has exactly 6 non-empty quadrants: Thinks, Feels, Says, Does, Pains, Gains
    - **Validates: Requirements 10.2**

  - [x] 18.8 Write property test for stakeholder register structure (Property 11)
    - **Property 11: Stakeholder register structure validity** — Every stakeholder classified into one of 4 tiers, Power and Interest values each in [0, 1]
    - **Validates: Requirements 11.1, 11.2**

- [x] 19. Integration tests
  - [x] 19.1 Write integration tests for full upload → stream → persist flow
    - Test with mock LLM adapter returning canned responses
    - Verify SSE event sequence: section_start → chunks → section_done for each section, then all_done
    - Verify database persistence after stream completes
    - Verify session status transitions: pending → running → complete
    - _Requirements: 1.3, 2.1, 2.5, 3.1, 12.1_

  - [x] 19.2 Write integration tests for regeneration and export flows
    - Test regeneration updates single section, others unchanged
    - Test export endpoint returns valid Markdown with all sections
    - Test delete cascades to section results
    - _Requirements: 13.1, 13.2, 14.1_

- [x] 20. Frontend tests
  - [x] 20.1 Write frontend component tests
    - Test `TranscriptUploader` file selection, validation, and upload trigger
    - Test `SectionPanel` rendering in each status state (pending, streaming, complete, error)
    - Test `EmpathyMapGrid` renders 6 labeled quadrants
    - Test `InfluenceMapQuadrant` renders 4 quadrants with positioned markers
    - Test `ExportBar` clipboard and download button behavior
    - Test `SessionHistory` displays sessions and handles selection
    - _Requirements: 1.1, 3.2, 10.3, 11.3, 14.2, 12.2_

- [x] 21. Final checkpoint - Ensure all tests pass
  - 121 backend tests pass. Frontend TypeScript compiles cleanly.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using hypothesis
- Unit tests validate specific examples and edge cases
- Backend uses Python (FastAPI, SQLAlchemy, sse-starlette, hypothesis for property tests)
- Frontend uses TypeScript (Next.js App Router, React, inline styles with CSS custom properties)
- The existing catch-all proxy at `dashboard/app/api/[...path]/route.ts` handles SSE forwarding — no proxy changes needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "3.1"] },
    { "id": 2, "tasks": ["2.1", "3.2", "11.1", "11.2"] },
    { "id": 3, "tasks": ["2.2", "2.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "12.1"] },
    { "id": 5, "tasks": ["6.1", "7.1", "8.1", "9.1", "13.1"] },
    { "id": 6, "tasks": ["6.2", "7.2", "8.2", "8.3", "14.1"] },
    { "id": 7, "tasks": ["15.1", "15.2", "16.1", "16.2"] },
    { "id": 8, "tasks": ["18.1", "18.2", "18.3", "18.4", "18.5", "18.6", "18.7", "18.8"] },
    { "id": 9, "tasks": ["19.1", "19.2", "20.1"] }
  ]
}
```
