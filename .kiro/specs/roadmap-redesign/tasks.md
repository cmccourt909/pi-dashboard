# Implementation Plan: Roadmap Redesign

## Overview

This plan implements the WaypointPI Program Roadmap page rewrite, replacing the monolithic `roadmap/page.tsx` with a modular Gantt-style interactive view. Implementation proceeds from backend API through frontend component architecture, wiring together with filtering, drawer interactions, and accessibility concerns.

## Tasks

- [x] 1. Create TypeScript types and backend API endpoint
  - [x] 1.1 Create shared TypeScript interfaces for roadmap data
    - Create `dashboard/types/roadmap.ts` with `FeatureItem`, `PICompletion`, `SprintBreakdown`, `KPISummary` interfaces
    - Include type unions for `rag_status`, `team`, and `sprint state`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.2 Implement Pydantic response schemas for FeatureItem API
    - Add `PICompletionOut`, `SprintBreakdownOut`, and `FeatureItemOut` schemas to `app/api/schemas.py`
    - Ensure field types match the TypeScript interface contract
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.3 Implement the GET /api/pis/{pi}/features endpoint
    - Add new route in `app/api/routers/roadmap.py` that queries `Issue`, `FeatureMembership`, `IssueLink`, and `Sprint` tables
    - Implement team derivation from project key prefix mapping (TSU → Alpha, ISC → Bravo, PNR → Charlie)
    - Implement blocker extraction from `IssueLink` where `link_type = 'blocks'`
    - Implement sprint breakdown aggregation filtered by PI
    - Implement RAG status computation using `compute_rag_status(done_pct, days_remaining, is_blocked)`
    - Return HTTP 404 when PI parameter does not match existing Program Increment
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x]* 1.4 Write property test: completion percentages sum to 100
    - **Property 1: Completion percentages sum to 100**
    - Use `fast-check` to generate arbitrary `done_pct`, `prog_pct`, `todo_pct` values and verify they sum to 100 within floating-point tolerance
    - **Validates: Requirements 2.2**

  - [x]* 1.5 Write property test: RAG status is always a valid enum value
    - **Property 2: RAG status is always a valid enum value**
    - Use `fast-check` to generate arbitrary `done_pct`, `days_remaining`, `is_blocked` combinations and verify result is always "red", "amber", or "green"
    - **Validates: Requirements 2.3**

- [x] 2. Checkpoint - Ensure API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Gantt chart layout components
  - [x] 3.1 Create GanttHeader component
    - Create `dashboard/components/roadmap/GanttHeader.tsx` rendering PI column headers with sprint bands and month labels
    - Accept PI date ranges for positioning
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Create GanttBar component with segment rendering
    - Create `dashboard/components/roadmap/GanttBar.tsx` rendering three contiguous segments (teal done, blue 60% in-progress, gray 40% todo)
    - Implement proportional width calculation based on percentages
    - Enforce minimum 4px width for non-zero segments
    - Implement label placement logic: inside Done_Segment when `done_pct >= 15`, outside to the right otherwise
    - Add `aria-label` attributes on each segment with percentage and category name
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.2_

  - [x]* 3.3 Write property test: Gantt bar segment widths proportional to percentages
    - **Property 3: Gantt bar segment widths are proportional to percentages**
    - Use `fast-check` to generate valid (done_pct, prog_pct, todo_pct) tuples summing to 100 and positive column_width, verify segment pixel widths are proportional and total equals column_width ±1px
    - **Validates: Requirements 4.5**

  - [x]* 3.4 Write property test: minimum segment width enforcement
    - **Property 4: Minimum segment width enforcement**
    - Use `fast-check` to verify any non-zero segment renders at least 4px wide
    - **Validates: Requirements 4.2**

  - [x]* 3.5 Write property test: label placement threshold
    - **Property 5: Label placement threshold**
    - Use `fast-check` to verify label is inside Done_Segment when `done_pct >= 15` and outside when `done_pct < 15`
    - **Validates: Requirements 4.3, 4.4**

  - [x] 3.6 Create TodayLine component
    - Create `dashboard/components/roadmap/TodayLine.tsx` rendering a 2px vertical coral (`#E8622A`) line
    - Implement position formula: `(today - pi_start) / (pi_end - pi_start) * column_width`
    - Only render within the PI_Column containing the current date
    - Do not render when current date falls outside both PI date ranges
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x]* 3.7 Write property test: Today line position formula
    - **Property 6: Today line position formula**
    - Use `fast-check` to generate dates within PI range and verify position calculation, and verify line does not appear in the other PI column
    - **Validates: Requirements 5.2, 5.3**

- [x] 4. Implement feature row and team grouping components
  - [x] 4.1 Create FeatureRow component
    - Create `dashboard/components/roadmap/FeatureRow.tsx` rendering a single feature row with click handler to open Detail Drawer
    - Compose `GanttBar`, `SprintMiniGrid`, and `BlockerFlag` within the row
    - Add data attributes for team-based CSS filtering
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Create TeamGroup component
    - Create `dashboard/components/roadmap/TeamGroup.tsx` as a collapsible wrapper grouping FeatureRows by team (Alpha, Bravo, Charlie)
    - Apply CSS class names for team-based filtering
    - _Requirements: 3.1, 6.2, 6.3_

  - [x] 4.3 Create SprintMiniGrid component
    - Create `dashboard/components/roadmap/SprintMiniGrid.tsx` rendering 5 mini-bars for PI 26.3 sprints
    - Active sprint renders at team color 55% opacity; future sprints render at `#e8e6e0`
    - Features with no stories in a sprint render diagonal hatch pattern
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x]* 4.4 Write property test: Sprint mini-grid always renders 5 bars
    - **Property 12: Sprint mini-grid always renders 5 bars**
    - Use `fast-check` to generate arbitrary feature data for PI 26.3 and verify exactly 5 mini-bars are rendered
    - **Validates: Requirements 8.1**

  - [x] 4.5 Create BlockerFlag component
    - Create `dashboard/components/roadmap/BlockerFlag.tsx` rendering a ⚠ icon for cross-team blocking dependencies
    - Only show when source team differs from target team
    - On click, open Detail Drawer and scroll to dependency section
    - _Requirements: 10.1, 10.2, 10.3_

  - [x]* 4.6 Write property test: Blocker flag cross-team rule
    - **Property 11: Blocker flag cross-team rule**
    - Use `fast-check` to generate feature/dependency configurations and verify Blocker_Flag appears if and only if a cross-team dependency exists
    - **Validates: Requirements 10.1, 10.2**

- [x] 5. Checkpoint - Ensure component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement filtering, summary, and sidebar
  - [x] 6.1 Create FilterBar component
    - Create `dashboard/components/roadmap/FilterBar.tsx` with pill buttons for "All", "Alpha", "Bravo", "Charlie"
    - Apply CSS-only visibility toggling on TeamGroup elements for sub-16ms filter updates
    - Visually indicate active filter pill with distinct selected state
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 12.3_

  - [x] 6.2 Create SummaryStrip component
    - Create `dashboard/components/roadmap/SummaryStrip.tsx` displaying 5 KPI stat cells
    - Compute: total features, on track (rag == green), at risk (rag == amber or red), total stories, blocked (is_blocked_by.length > 0)
    - Recalculate KPIs when team filter changes to reflect only filtered features
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 6.5_

  - [x]* 6.3 Write property test: KPI computation invariant
    - **Property 8: KPI computation invariant**
    - Use `fast-check` to generate sets of FeatureItems and verify on_track, at_risk, and blocked counts match the defined formulas
    - **Validates: Requirements 9.2, 9.3, 9.4**

  - [x]* 6.4 Write property test: Filtered KPI recalculation
    - **Property 9: Filtered KPI recalculation**
    - Use `fast-check` to verify that applying a team filter produces KPI values computed only from matching features
    - **Validates: Requirements 6.5**

  - [x]* 6.5 Write property test: Team filter visibility
    - **Property 7: Team filter visibility**
    - Use `fast-check` to generate team assignments and filter selection, verify only matching features are visible
    - **Validates: Requirements 6.3**

  - [x] 6.6 Create Sidebar component
    - Create `dashboard/components/roadmap/Sidebar.tsx` as a 200px fixed-width column displaying feature labels grouped by team
    - _Requirements: 1.2, 3.1_

- [x] 7. Implement Detail Drawer and Lodestar Panel
  - [x] 7.1 Create DetailDrawer component
    - Create `dashboard/components/roadmap/DetailDrawer.tsx` as a 300px fixed-width slide-in panel from the right edge
    - Implement 200ms slide animation
    - Display feature metadata: feature_key, summary, rag_status, assignee
    - Display progress bar with done/prog/todo percentages
    - Display dependency list (blockers and blocked-by)
    - Close on Escape key, close button (✕) click, and click outside
    - Apply `inert` attribute on background content while open for focus trapping
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [x] 7.2 Create LodestarPanel component
    - Create `dashboard/components/roadmap/LodestarPanel.tsx` displaying `lodestar_static` AI narrative text
    - Show "AI narrative not yet generated" placeholder when text is null
    - _Requirements: 7.6_

  - [x]* 7.3 Write property test: Detail drawer displays all feature data
    - **Property 10: Detail drawer displays all feature data**
    - Use `fast-check` to generate arbitrary FeatureItems and verify all fields are rendered in the drawer
    - **Validates: Requirements 7.3, 7.4, 7.5**

  - [x]* 7.4 Write property test: Aria-labels on Gantt bar segments
    - **Property 13: Aria-labels on Gantt bar segments**
    - Use `fast-check` to verify each non-zero segment has an aria-label with percentage and category name
    - **Validates: Requirements 11.2**

- [x] 8. Checkpoint - Ensure drawer and filter tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Assemble RoadmapPage and wire components together
  - [x] 9.1 Rewrite RoadmapPage with component composition
    - Rewrite `dashboard/app/roadmap/page.tsx` as a `"use client"` component
    - Fetch `GET /api/pis/26.2/features` and `GET /api/pis/26.3/features` in parallel on mount
    - Compose all child components: GanttHeader, SummaryStrip, Sidebar, FilterBar, TeamGroup (with FeatureRow, GanttBar, SprintMiniGrid, BlockerFlag), DetailDrawer (with LodestarPanel), TodayLine
    - Implement state management for active filter, selected feature, and drawer open/close
    - Handle API error states: error banner with retry, empty state message, missing data fallbacks
    - Wrap in existing ErrorBoundary
    - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 3.3_

  - [x] 9.2 Implement accessibility features
    - Add visible keyboard focus indicators on all interactive elements
    - Support sequential keyboard navigation through Feature_Rows using Tab and arrow keys
    - Respect `prefers-reduced-motion` media query to disable animations
    - _Requirements: 11.1, 11.3, 11.4, 11.5_

  - [x]* 9.3 Write unit tests for RoadmapPage integration
    - Test component composition with mock API data
    - Test filter interactions update TeamGroup visibility and SummaryStrip KPIs
    - Test drawer open/close lifecycle
    - Test error states and empty states
    - _Requirements: 3.1, 3.2, 6.2, 6.3, 7.1_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout (Next.js frontend, fast-check for PBT)
- CSS-only filtering is critical for the 16ms performance requirement — avoid React re-renders for filter toggling

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "3.1", "3.2", "3.6"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5", "3.7", "4.1", "4.3", "4.5"] },
    { "id": 4, "tasks": ["4.2", "4.4", "4.6", "6.1", "6.6"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "6.5"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3", "7.4", "9.1"] },
    { "id": 8, "tasks": ["9.2"] },
    { "id": 9, "tasks": ["9.3"] }
  ]
}
```
