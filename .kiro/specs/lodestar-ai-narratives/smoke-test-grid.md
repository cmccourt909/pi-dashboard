# Lodestar AI Functional Smoke Test Grid

Use this grid to manually verify the Lodestar AI integration end-to-end in a running local environment.

## Environment Setup

1. Start the backend: `uvicorn app.main:app --reload` (or Docker Compose)
2. Start the frontend: `cd dashboard && npm run dev`
3. Seed demo data or ensure the target PI has features with narratives
4. Open `http://localhost:3000/roadmap` and navigate to a feature with a Lodestar panel

## Smoke Test Grid

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| S1 | Cached narrative renders | Open a feature that already has a `lodestar_static` narrative. | The narrative text is displayed in the Lodestar panel. | ☐ |
| S2 | Structured sections render | Open a feature whose cached narrative contains all three sentinel headers: `Delivery Status:`, `Risks & Blockers:`, `Recommended Actions:`. | Three distinct sections are shown with their own labels/borders/colors. | ☐ |
| S3 | Plain text fallback | Open a feature whose cached narrative has no sentinel headers. | The entire text is rendered as a single plain narrative block (no broken sections). | ☐ |
| S4 | Regenerate triggers SSE stream | Click the **Regenerate** button in the Lodestar panel. | The button shows a loading state and the stream state changes to `streaming`. | ☐ |
| S5 | Streamed chunks accumulate | While streaming, watch the panel text. | Tokens/chunks appear incrementally and build up to the full narrative. | ☐ |
| S6 | Streamed text renders structured | After streaming completes, verify the new narrative contains sentinel headers. | The panel re-renders into three structured sections. | ☐ |
| S7 | Relative timestamp updates | After a successful regeneration, check the timestamp below the narrative. | It shows a recent relative time such as "Generated just now" or "Generated 1 minute ago". | ☐ |
| S8 | Error state displayed | Simulate an SSE error (e.g., stop the backend mid-stream, or return an error event) and click Regenerate. | An inline error message is shown and the button is re-enabled. | ☐ |
| S9 | No PI passed gracefully | Open a feature where the parent PI is unavailable and click Regenerate. | The stream request is not made (or fails gracefully) without crashing the UI. | ☐ |
| S10 | Cleanup on unmount | Start a regeneration, then close the detail drawer before the stream completes. | The EventSource connection is closed and no further state updates occur. | ☐ |
| S11 | Multiple regenerations | Click Regenerate twice in rapid succession. | The first stream is aborted and only the second stream's text accumulates. | ☐ |
| S12 | Empty response handled | Regenerate a feature where the LLM returns an empty response. | The panel shows a placeholder or error message instead of blank content. | ☐ |
| S13 | Headers in non-standard order | Stream or cache a narrative with headers in a different order (e.g., `Recommended Actions:` first). | Each section is parsed into the correct visual bucket regardless of order. | ☐ |
| S14 | Keyboard/screen reader accessibility | Tab to the Regenerate button and use a screen reader on the panel. | The button is focusable and the section labels are announced. | ☐ |

## Pass/Fail Criteria

- **Pass**: All 14 scenarios behave as expected with no console errors or backend exceptions.
- **Fail**: Any scenario produces incorrect UI, crashes, or leaves an open EventSource connection.

## Notes / Issues

| ID | Observed Behavior | Severity | Owner |
|----|-------------------|----------|-------|
|    |                   |          |       |
|    |                   |          |       |
|    |                   |          |       |
