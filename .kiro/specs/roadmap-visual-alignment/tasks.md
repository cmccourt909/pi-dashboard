# Implementation Plan: Roadmap Visual Alignment

## Overview

Align the existing WaypointPI roadmap page visual presentation with the HTML reference design. This involves creating a design tokens file, adding new UI components (PageHeader, LegendBar, TeamLetterIcon, RagBadge), and modifying existing components (NavBar, FilterBar, SummaryStrip, Sidebar, TeamGroup, FeatureRow, GanttHeader, RoadmapPage layout) to match the reference styling, spacing, and typography.

## Tasks

- [ ] 1. Create design tokens and utility functions
  - [ ] 1.1 Create `tokens.ts` design tokens file
    - Create `dashboard/components/roadmap/tokens.ts`
    - Export `DESIGN_TOKENS` constant containing all color, spacing, typography, and card style values from the design document
    - Export team letter mapping (`Alpha → α`, `Bravo → β`, `Charlie → γ`)
    - Export `computeAggregateRag` function that derives team-level RAG status from feature RAG statuses
    - Export `formatSubtitle` function that produces the delimiter-joined subtitle string
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 1.2 Write property tests for `formatSubtitle`
    - **Property 2: Subtitle formatter produces delimited string**
    - For any valid combination of org name, PI range, team count (≥1), feature count (≥0), and date string, verify output contains all values separated by " · " (exactly 4 delimiters)
    - **Validates: Requirements 2.2**

  - [ ]* 1.3 Write property tests for `computeAggregateRag`
    - **Property 8: Team group header with RAG badge (aggregate computation)**
    - For any list of features with RAG statuses, verify: any red → "blocked", any amber (no red) → "at-risk", all green → "on-track"
    - **Validates: Requirements 6.2**

- [ ] 2. Create new UI components
  - [ ] 2.1 Create `TeamLetterIcon` component
    - Create `dashboard/components/roadmap/TeamLetterIcon.tsx`
    - Render a circular 28px badge with team color background and white Greek letter
    - Accept `team` prop (team identifier) and optional `size` prop (default 28)
    - Use `DESIGN_TOKENS.colors` for team colors and `DESIGN_TOKENS.teamLetters` for letter mapping
    - _Requirements: 5.2, 5.3, 6.1, 10.1_

  - [ ]* 2.2 Write property tests for `TeamLetterIcon`
    - **Property 6: Team Letter Icon renders correct color and letter**
    - For any team identifier (Alpha, Bravo, Charlie), verify the icon renders the designated color and Greek letter
    - **Validates: Requirements 5.2, 5.3, 10.1**

  - [ ] 2.3 Create `RagBadge` component
    - Create `dashboard/components/roadmap/RagBadge.tsx`
    - Render a pill-shaped badge with text and colors based on `status` prop
    - "on-track" → green bg #dcfce7, text #166534, label "On Track"
    - "at-risk" → amber bg #fef3c7, text #92400e, label "At Risk"
    - "blocked" → red bg #fee2e2, text #991b1b, label "Blocked"
    - _Requirements: 6.2_

  - [ ]* 2.4 Write property tests for `RagBadge`
    - **Property 8: Team group header with RAG badge (badge styling)**
    - For any aggregate RAG status, verify badge renders correct text, background color, and text color
    - **Validates: Requirements 6.2**

  - [ ] 2.5 Create `PageHeader` component
    - Create `dashboard/components/roadmap/PageHeader.tsx`
    - Render title "Program Roadmap" in 24px/700/#1e293b
    - Render subtitle line using `formatSubtitle` with " · " delimiters in 13px/400/#64748b
    - Accept `children` prop for rendering FilterPills below the subtitle
    - Apply 24px top padding and 16px bottom padding
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 2.6 Create `LegendBar` component
    - Create `dashboard/components/roadmap/LegendBar.tsx`
    - Render legend entries: Done (teal #0d9488 square), In progress (blue square), To do (gray square), Today (coral #E8622A vertical line), Blocker (⚠ icon)
    - Render helper text: "Click any feature row to inspect · sprints shown as mini-bars in PI 26.3"
    - Apply top border 1px solid #e2e8f0, padding 12px 16px, white background
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 2.7 Write unit tests for `PageHeader` and `LegendBar`
    - Test PageHeader renders title with correct styles
    - Test PageHeader subtitle contains all metadata segments
    - Test LegendBar contains all 5 legend entries with correct colors
    - Test LegendBar helper text is present
    - _Requirements: 2.1, 2.2, 9.2, 9.3_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Modify NavBar branding and navigation links
  - [ ] 4.1 Update NavBar branding in root layout
    - Modify the root layout header to display "WaypointPI" as brand name in 15px/600/white
    - Set NavBar background to #1e293b
    - Add "Lodestar active" indicator: green dot (8px, #10b981) + text "Lodestar active" in 12px white
    - Update nav link order: PI Health, Roadmap, Findings, SteerCo, Admin
    - Active link: solid white; inactive: 55% white opacity
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 4.2 Write property tests for NavBar active link styling
    - **Property 1: Navigation link active styling**
    - For any valid route path and navigation link, verify the matching link renders solid white and non-matching links render at 55% opacity
    - **Validates: Requirements 1.5**

- [ ] 5. Modify FilterBar styling and labels
  - [ ] 5.1 Update FilterBar pill labels and styling
    - Change labels from "All", "Alpha", "Bravo", "Charlie" to "All teams", "Team Alpha", "Team Bravo", "Team Charlie"
    - Active pill styling: background #4f46e5, white text, 1px solid #4f46e5 border
    - Inactive pill styling: transparent background, #334155 text, 1px solid #cbd5e1 border
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 5.2 Write property tests for FilterBar labels and styling
    - **Property 3: Filter pill label format**
    - For any team name (Alpha, Bravo, Charlie), verify pill label equals "Team {name}"; "All" → "All teams"
    - **Property 4: Filter pill active/inactive styling**
    - For any filter state, verify selected pill has indigo styling, non-selected pills have inactive styling
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 6. Modify SummaryStrip (KPI cards) layout
  - [ ] 6.1 Redesign SummaryStrip as KPI card layout
    - Restructure each metric into a distinct card with three lines: title (12px uppercase #64748b), value (28px bold #1e293b), subtitle (11px #94a3b8)
    - Card styling: white background, 8px radius, box-shadow 0 1px 3px rgba(0,0,0,0.08)
    - Container: #f8fafc background, 16px vertical padding
    - Card order: "Active PI", "Features in flight", "PI completion", "Blockers", "Unestimated stories"
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 6.2 Write property tests for KPI card structure
    - **Property 5: KPI card three-line structure**
    - For any valid feature data producing KPI metrics, verify each card contains exactly three text elements with correct typography
    - **Validates: Requirements 4.2**

- [ ] 7. Modify Sidebar with team icons and RAG dots
  - [ ] 7.1 Update Sidebar team headers and feature labels
    - Set sidebar to 200px fixed width, white background, right border 1px solid #e2e8f0
    - Add `TeamLetterIcon` to team group headers
    - Add metadata text (feature count, sprint count) to team headers
    - Add RAG_Status_Dot (8px circle) in feature RAG color before each feature name
    - Truncate feature labels with ellipsis when exceeding width
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.2 Write property tests for Sidebar RAG dots
    - **Property 7: RAG status dot color mapping**
    - For any feature with RAG status (green, amber, red), verify the sidebar dot renders with the correct color
    - **Validates: Requirements 5.4**

- [ ] 8. Modify TeamGroup header in Gantt area
  - [ ] 8.1 Enhance TeamGroup header with icon and badge
    - Add `TeamLetterIcon` to team group header
    - Add `RagBadge` showing aggregate team status using `computeAggregateRag`
    - Team name in 13px/600
    - Background: #f8fafc, border-bottom 1px solid #e2e8f0
    - Chevron: right-pointing when collapsed, downward when expanded
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 8.2 Write unit tests for TeamGroup header
    - Test chevron rotation on collapse/expand
    - Test TeamLetterIcon presence
    - Test RagBadge renders correct status
    - _Requirements: 6.1, 6.2, 6.4_

- [ ] 9. Modify FeatureRow inline labels and blocker flag
  - [ ] 9.1 Add inline labels and styling to FeatureRow
    - PI 26.2 column: display feature name (13px #334155) + key (11px #64748b) left of GanttBar
    - PI 26.3 column: display SprintMiniGrid + current sprint name (10px #64748b)
    - No PI 26.3 scope: display "No PI 26.3 scope" in 11px italic #94a3b8
    - Vertical padding: 8px, hover background: #f8fafc
    - BlockerFlag (⚠) with 4px left margin when feature has cross-team blockers
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 9.2 Write property tests for FeatureRow content
    - **Property 9: Feature row PI 26.2 displays name and key**
    - For any feature in PI 26.2, verify row contains feature name and key label
    - **Property 10: Feature row PI 26.3 displays sprint grid or no-scope message**
    - For any feature in PI 26.3, verify sprint grid presence or "No PI 26.3 scope" text
    - **Property 11: BlockerFlag presence for blocked features**
    - For any feature with blockers, verify ⚠ icon renders with 4px left margin
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

- [ ] 10. Modify GanttHeader with date ranges and active sprint indicator
  - [ ] 10.1 Update GanttHeader styling and sprint bands
    - Display PI date range (e.g. "May 21 – Aug 5") in 11px #64748b below PI name
    - Sprint labels in "26.2.1" format in #e8edf5 bands (3px radius, 10px font)
    - Active sprint indicator: "▶" in indigo #4f46e5
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 10.2 Write property tests for GanttHeader
    - **Property 12: Gantt header PI metadata display**
    - For any PI with valid dates, verify header displays PI name and formatted date range
    - **Property 13: Sprint bands with active sprint indicator**
    - For any sprint set with one active sprint, verify "▶" indicator is present only on active sprint
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Wire layout together in RoadmapPage
  - [ ] 12.1 Restructure RoadmapPage layout
    - Wrap FilterBar inside new PageHeader component (move FilterBar as child)
    - Compose vertical layout: NavBar → PageHeader → KPI_Strip → GanttHeader → Sidebar + Gantt columns → LegendBar
    - Sidebar fixed at 200px width, Gantt columns at min 400px each
    - Gantt container: overflow-x auto for horizontal scrolling
    - White primary background, #f8fafc for section header backgrounds
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 12.2 Write unit tests for layout structure
    - Test vertical order: PageHeader → KPI → GanttHeader → content → Legend
    - Test sidebar is 200px fixed width
    - Test PI column minimum width is 400px
    - Test horizontal scroll enabled on overflow container
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific rendering scenarios and fixed visual requirements
- The design uses inline React styles (no CSS modules), extracting shared values to `tokens.ts`
- Existing component APIs are extended, not broken — no breaking prop changes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "2.3", "2.5", "2.6"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.7", "4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["4.2", "5.2", "6.2", "7.1", "8.1", "9.1", "10.1"] },
    { "id": 4, "tasks": ["7.2", "8.2", "9.2", "10.2"] },
    { "id": 5, "tasks": ["12.1"] },
    { "id": 6, "tasks": ["12.2"] }
  ]
}
```
