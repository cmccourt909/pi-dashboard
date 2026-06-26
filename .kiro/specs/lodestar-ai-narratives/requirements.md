# Requirements Document

## Introduction

This feature adds AI-generated delivery narratives ("Lodestar narratives") to the WaypointPI Program Roadmap. Each feature (epic) receives a short AI-generated paragraph summarizing its delivery health, risks, and trajectory. These narratives are persisted in the database, served via the existing FeatureItem API, displayed in the DetailDrawer's LodestarPanel component, and regenerated when underlying data changes or on user demand.

## Glossary

- **Narrative_Generator**: The backend service responsible for gathering feature context and calling Azure OpenAI to produce a delivery narrative.
- **Lodestar_Narrative**: A 2–3 sentence AI-generated paragraph describing a feature's delivery health, risks, and trajectory.
- **Feature**: An epic-level Issue in the WaypointPI system representing a deliverable tracked on the roadmap.
- **LodestarPanel**: The frontend component within the DetailDrawer that renders the narrative text or a placeholder.
- **Staleness_Threshold**: The condition under which a stored narrative is considered outdated and eligible for regeneration.
- **Data_Sync**: The process of importing or refreshing Jira data into the WaypointPI database (via upload/parse-sync).
- **SSE_Stream**: A Server-Sent Events connection that delivers narrative text token-by-token to the frontend in real time.
- **Feature_API**: The existing `GET /api/pis/{pi}/features` endpoint that returns structured feature data to the roadmap frontend.

## Requirements

### Requirement 1: Narrative Persistence

**User Story:** As a delivery manager, I want AI narratives to be stored in the database per feature, so that they can be retrieved quickly without regenerating on every page load.

#### Acceptance Criteria

1. THE Narrative_Generator SHALL persist each Lodestar_Narrative with an association to exactly one Feature (identified by feature issue ID), enforcing a one-to-one relationship such that at most one narrative exists per Feature at any time.
2. THE Narrative_Generator SHALL store a `generated_at` timestamp in UTC alongside each Lodestar_Narrative.
3. WHEN a Lodestar_Narrative is generated for a Feature that already has a stored narrative, THE Narrative_Generator SHALL replace the existing narrative with the new one, updating both the narrative text and the `generated_at` timestamp.
4. THE Narrative_Generator SHALL store the model deployment name (maximum 100 characters) used for generation alongside each Lodestar_Narrative.
5. IF narrative generation is triggered for a feature issue ID that does not exist in the database, THEN THE Narrative_Generator SHALL return an error response indicating that the Feature was not found, without persisting any data.

### Requirement 2: Narrative Generation Logic

**User Story:** As a delivery manager, I want the AI narrative to reflect current feature context (progress, blockers, velocity, team), so that the summary is accurate and actionable.

#### Acceptance Criteria

1. WHEN narrative generation is triggered for a Feature, THE Narrative_Generator SHALL gather the following context: completion percentage (count of child stories in "done" status category divided by total child story count), blocker count (number of unresolved issues with link type "blocks" targeting child stories), sprint velocity (average stories moved to "done" per sprint over the last 3 closed sprints in the PI), status category changes within the last 14 days, team name, and days remaining in the PI.
2. IF any context value cannot be determined (e.g., no closed sprints exist for velocity calculation), THEN THE Narrative_Generator SHALL use a default of zero for numeric fields and "unknown" for text fields, and proceed with generation.
3. WHEN context is gathered, THE Narrative_Generator SHALL construct a prompt including the gathered context and call Azure OpenAI to produce a Lodestar_Narrative of 2–3 sentences with a temperature of 0.3.
4. THE Narrative_Generator SHALL use the existing `_get_openai_client` and `_call_with_retry` patterns from the enrichment module for Azure OpenAI communication.
5. THE Narrative_Generator SHALL constrain the LLM response to a maximum of 200 tokens.
6. WHEN generation completes successfully, THE Narrative_Generator SHALL persist the resulting Lodestar_Narrative and return a response containing the narrative text and the `generated_at` timestamp.

### Requirement 3: API Integration

**User Story:** As a frontend developer, I want the Feature API to return stored narratives in the existing `lodestar_static` field, so that the LodestarPanel can display them without additional API calls.

#### Acceptance Criteria

1. WHEN the Feature_API returns a FeatureItemOut response for a Feature that has a persisted Lodestar_Narrative, THE Feature_API SHALL populate the `lodestar_static` field with the verbatim stored narrative text for that Feature.
2. IF no Lodestar_Narrative exists for a Feature, THEN THE Feature_API SHALL return `null` in the `lodestar_static` field.
3. THE Feature_API SHALL NOT call the Narrative_Generator during request handling; it SHALL only read previously persisted narratives from the database.
4. WHEN the Feature_API returns a FeatureItemOut response for a Feature that has a persisted Lodestar_Narrative, THE Feature_API SHALL include the `generated_at` ISO 8601 UTC timestamp associated with that narrative so the frontend can display narrative freshness.
5. IF no Lodestar_Narrative exists for a Feature, THEN THE Feature_API SHALL return `null` in the `generated_at` field.

### Requirement 4: Staleness and Regeneration Triggers

**User Story:** As a delivery manager, I want narratives to be regenerated when underlying data changes, so that the AI summary stays current with the actual delivery state.

#### Acceptance Criteria

1. WHEN a Data_Sync completes successfully, THE Narrative_Generator SHALL mark all narratives as stale for Features whose underlying issue data (completion percentage, blocker count, status category, or assignee) was created or modified during that sync.
2. WHEN a narrative is marked stale, THE Narrative_Generator SHALL enqueue background regeneration of the Lodestar_Narrative for that Feature within 60 seconds of the staleness marking.
3. IF background regeneration of a stale narrative fails, THEN THE Narrative_Generator SHALL retain the previously stored Lodestar_Narrative and log the failure without retrying automatically.
4. THE Narrative_Generator SHALL expose a `POST /api/features/{feature_key}/narrative/generate` endpoint that triggers on-demand regeneration for a single Feature.
5. WHEN on-demand regeneration is requested, THE Narrative_Generator SHALL return the newly generated Lodestar_Narrative text and the `generated_at` timestamp (ISO 8601 format) in the response body.
6. IF on-demand regeneration is requested for a feature_key that does not exist, THEN THE Narrative_Generator SHALL return HTTP 404 with an error message indicating the Feature was not found.

### Requirement 5: Batch Generation

**User Story:** As a system administrator, I want to generate narratives for all features in a PI at once, so that narratives are populated after initial setup or a bulk data import.

#### Acceptance Criteria

1. THE Narrative_Generator SHALL expose a `POST /api/pis/{pi}/narratives/generate` endpoint that triggers narrative generation for all Features in the specified PI.
2. WHEN batch generation is triggered, THE Narrative_Generator SHALL process Features sequentially to avoid Azure OpenAI rate limiting.
3. WHEN batch generation is triggered, THE Narrative_Generator SHALL return a summary response containing the count of narratives generated and any failures.
4. IF a single Feature narrative fails during batch generation, THEN THE Narrative_Generator SHALL continue generating narratives for remaining Features and report the failure in the summary.

### Requirement 6: Error Handling and Graceful Degradation

**User Story:** As a delivery manager, I want the roadmap to remain usable when Azure OpenAI is unavailable, so that narrative generation failures do not disrupt my workflow.

#### Acceptance Criteria

1. IF Azure OpenAI is unreachable or returns an error during narrative generation, THEN THE Narrative_Generator SHALL log the error and return a structured error response without crashing.
2. IF narrative generation fails, THEN THE Narrative_Generator SHALL preserve any previously stored Lodestar_Narrative for that Feature (no data loss on failure).
3. IF Azure OpenAI is not configured (missing environment variables), THEN THE Narrative_Generator SHALL return HTTP 503 with a descriptive error message.
4. THE Narrative_Generator SHALL use the same error taxonomy (ProviderAuthError, ProviderRateLimitError, ProviderTimeoutError) as the existing enrichment module.
5. IF the LLM response cannot be parsed as valid narrative text, THEN THE Narrative_Generator SHALL discard the response and return a parse error without persisting invalid content.

### Requirement 7: Performance and Non-Blocking Behavior

**User Story:** As a delivery manager, I want the roadmap page to load quickly regardless of narrative generation status, so that AI processing does not delay my access to delivery data.

#### Acceptance Criteria

1. THE Feature_API SHALL return feature data (including pre-stored `lodestar_static`) within 300ms for a typical PI (up to 30 features), independent of narrative generation activity.
2. THE Narrative_Generator SHALL execute generation as a background process that does not block the Feature_API response.
3. WHEN batch generation is running, THE Feature_API SHALL continue serving requests with the most recently persisted narratives (eventual consistency).

### Requirement 8: Phase 2 — SSE Streaming (Deferred)

**User Story:** As a delivery manager, I want to see the AI narrative appear token-by-token in real time when I request regeneration, so that I get immediate feedback that generation is in progress.

#### Acceptance Criteria

1. THE Narrative_Generator SHALL expose a `GET /api/features/{feature_key}/narrative/stream` endpoint that returns an SSE_Stream.
2. WHEN the SSE_Stream endpoint is called, THE Narrative_Generator SHALL stream tokens from Azure OpenAI to the client as `data:` events.
3. WHEN streaming completes, THE Narrative_Generator SHALL send a final `event: done` message containing the full narrative text and `generated_at` timestamp.
4. WHEN streaming completes, THE Narrative_Generator SHALL persist the completed Lodestar_Narrative to the database.
5. IF an error occurs during streaming, THEN THE Narrative_Generator SHALL send an `event: error` message with a descriptive payload and close the connection.
6. THE LodestarPanel SHALL render incoming SSE tokens progressively, appending each token to the displayed text.
7. WHILE the SSE_Stream is active, THE LodestarPanel SHALL display a visual indicator that generation is in progress.

### Requirement 9: On-Demand Regeneration UI

**User Story:** As a delivery manager, I want a "Regenerate" button in the LodestarPanel, so that I can manually refresh a narrative when I know data has changed.

#### Acceptance Criteria

1. THE LodestarPanel SHALL display a "Regenerate" button adjacent to the narrative text.
2. WHEN the user clicks "Regenerate", THE LodestarPanel SHALL call the on-demand regeneration endpoint for the displayed Feature.
3. WHILE regeneration is in progress, THE LodestarPanel SHALL disable the "Regenerate" button and display a loading indicator.
4. WHEN regeneration completes successfully, THE LodestarPanel SHALL replace the displayed text with the new Lodestar_Narrative.
5. IF regeneration fails, THEN THE LodestarPanel SHALL display an inline error message and re-enable the "Regenerate" button.
6. THE LodestarPanel SHALL display the `generated_at` timestamp formatted as a relative time (e.g., "Generated 2 hours ago") below the narrative text.

### Requirement 10: Phase 3 — Structured Section Rendering

**User Story:** As a delivery manager, I want the Lodestar narrative split into clearly labeled sections (Delivery Status, Risks & Blockers, Recommended Actions) so that I can quickly scan the most relevant information.

#### Acceptance Criteria

1. THE `LodestarPanel` SHALL render a streamed or stored narrative as three distinct sections: **Delivery Status**, **Risks & Blockers**, and **Recommended Actions**.
2. THE backend prompt template (v2.0) SHALL elicit each section with explicit sentinel headers (`Delivery Status:`, `Risks & Blockers:`, `Recommended Actions:`) so the frontend can parse them deterministically.
3. THE frontend SHALL implement a `parseSections` utility that accepts a raw narrative string and returns the three typed sections, preserving any section that is missing or empty as an empty string.
4. EACH section SHALL be rendered with distinct visual styling (e.g., color, icon, or border) so a user can distinguish them at a glance.
5. IF the raw narrative does not contain a recognized section header, THEN THE `parseSections` utility SHALL return the unmatched text as the **Delivery Status** section and leave the other two sections empty.
6. THE `LodestarPanel` prop signature SHALL remain unchanged so that `DetailDrawer.tsx` requires no modifications.

### Requirement 11: Phase 3 — Streaming Hook Property Tests

**User Story:** As a developer, I want property-based tests for the Lodestar SSE streaming hook so that the state machine is robust against arbitrary event sequences.

#### Acceptance Criteria

1. THE `useLodestarStream` hook SHALL be implemented (or the existing one updated) to consume the backend SSE endpoint `GET /api/pis/{pi}/features/{feature_key}/lodestar`.
2. THE hook SHALL maintain a state machine with at least the following states: `idle`, `loading`, `streaming`, `complete`, and `error`.
3. THE hook SHALL transition from `idle` → `loading` when a stream is requested, `loading` → `streaming` on the first `chunk` event, and `streaming` → `complete` on the `done` event.
4. IF an `error` event is received at any point, THEN THE hook SHALL transition to the `error` state and capture the error message.
5. THE hook SHALL accumulate chunk text and expose the accumulated narrative as it arrives.
6. THE hook SHALL cancel the SSE connection and clean up event listeners on unmount or when a new stream is started.
7. A `fast-check` property test SHALL verify that for any valid sequence of `meta`, `chunk`, `done`, and `error` events, the hook's final state and accumulated text are consistent with the event sequence.
8. A `fast-check` property test SHALL verify that arbitrary interleavings of `chunk` events produce the same final text as the concatenation of all chunk texts in order.
