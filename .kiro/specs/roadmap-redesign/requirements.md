# Requirements Document

## Introduction

This document specifies the requirements for a complete rewrite of the WaypointPI Program Roadmap page. The redesign delivers an interactive Gantt-style view showing PI-level feature progress, sprint health, cross-team dependencies, and AI-generated delivery narratives. Phase 1 covers the static roadmap with all UI components; Phase 2 (deferred) adds streaming Lodestar AI narratives via SSE.

## Glossary

- **Roadmap_Page**: The top-level page component that renders the full PI roadmap view at the `/roadmap` route
- **Gantt_Header**: The horizontal timeline header displaying PI columns, sprint bands, and month labels
- **Summary_Strip**: A horizontal row of KPI stat cells displayed above the Gantt chart
- **Sidebar**: The fixed 200px left column displaying feature labels grouped by team
- **Filter_Bar**: The row of filter pill buttons used to select team views
- **Team_Group**: A collapsible visual grouping of feature rows belonging to one team (Alpha, Bravo, or Charlie)
- **Feature_Row**: A single horizontal row representing one feature within the Gantt chart area
- **Gantt_Bar**: The colored progress bar rendered within a Feature_Row showing done/in-progress/todo segments
- **Sprint_Mini_Grid**: A set of 5 mini-bars within the PI 26.3 column indicating per-sprint status for a feature
- **Detail_Drawer**: A 300px slide-in panel from the right edge showing feature metadata and enrichment text
- **Lodestar_Panel**: The section within Detail_Drawer displaying AI-generated delivery narrative text
- **Today_Line**: A 2px vertical coral-colored line indicating the current date position within the active PI column
- **FeatureItem_API**: The backend endpoint `GET /api/pis/{pi}/features` returning structured feature progress data
- **FeatureItem**: The data transfer object returned by FeatureItem_API containing pi_completion, rag_status, blockers, and lodestar fields
- **PI_Column**: A fixed-width column in the Gantt layout representing one Program Increment (26.2 or 26.3)
- **RAG_Status**: Red/Amber/Green status indicator for feature health
- **Blocker_Flag**: A warning icon (⚠) displayed on features that have cross-team blocking dependencies
- **Done_Segment**: The teal-colored portion of a Gantt_Bar representing completed work
- **InProgress_Segment**: The blue (60% opacity) portion of a Gantt_Bar representing active work
- **Todo_Segment**: The gray (40% opacity) portion of a Gantt_Bar representing remaining work

## Requirements

### Requirement 1: Dual PI Column Layout

**User Story:** As a delivery manager, I want to see PI 26.2 and PI 26.3 progress side by side, so that I can compare delivery health across planning increments.

#### Acceptance Criteria

1. THE Roadmap_Page SHALL render two fixed-width PI_Column elements (PI 26.2 and PI 26.3) positioned side by side
2. THE Sidebar SHALL render as a 200px fixed-width column to the left of the PI_Columns containing feature labels
3. THE Roadmap_Page SHALL support horizontal scrolling with a minimum viewport width of 900px
4. WHILE the viewport width is less than the combined width of the Sidebar and both PI_Columns, THE Roadmap_Page SHALL enable horizontal scrolling

### Requirement 2: FeatureItem API Endpoint

**User Story:** As a frontend developer, I want a dedicated API endpoint that returns structured feature progress data per PI, so that the roadmap UI can render accurate completion metrics.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/pis/{pi}/features`, THE FeatureItem_API SHALL return an array of FeatureItem objects
2. THE FeatureItem_API SHALL include a `pi_completion` array for each FeatureItem containing `done_pct`, `prog_pct`, `todo_pct`, `story_count`, `sp_done`, and `sp_total` fields
3. THE FeatureItem_API SHALL include a `rag_status` field with value "red", "amber", or "green" for each FeatureItem
4. THE FeatureItem_API SHALL include a `blockers` array listing issue keys that the feature is blocking
5. THE FeatureItem_API SHALL include an `is_blocked_by` array listing issue keys that block the feature
6. THE FeatureItem_API SHALL include a `lodestar_static` field containing pre-generated AI enrichment text for the feature
7. WHEN the `{pi}` path parameter does not match an existing Program Increment, THE FeatureItem_API SHALL return HTTP 404 with a descriptive error message
8. THE FeatureItem_API SHALL respond within 300ms for the full feature set of a single PI

### Requirement 3: Component Architecture

**User Story:** As a frontend developer, I want a modular component structure under `components/roadmap/`, so that each visual element is independently testable and maintainable.

#### Acceptance Criteria

1. THE Roadmap_Page SHALL be composed of the following child components: Gantt_Header, Summary_Strip, Sidebar, Filter_Bar, Team_Group, Feature_Row, Gantt_Bar, Sprint_Mini_Grid, Detail_Drawer, and Lodestar_Panel
2. THE Roadmap_Page SHALL render all components within a single client-side page at the `/roadmap` route
3. WHEN any component receives updated props, THE Roadmap_Page SHALL re-render only the affected component subtree

### Requirement 4: Gantt Bar Rendering

**User Story:** As a delivery manager, I want to see a color-coded progress bar for each feature, so that I can quickly assess done, in-progress, and remaining work at a glance.

#### Acceptance Criteria

1. THE Gantt_Bar SHALL render three contiguous colored segments: Done_Segment (teal), InProgress_Segment (blue at 60% opacity), and Todo_Segment (gray at 40% opacity)
2. THE Gantt_Bar SHALL enforce a minimum width of 4px for each visible segment
3. WHEN `done_pct` is greater than or equal to 15%, THE Gantt_Bar SHALL render the percentage label inside the Done_Segment
4. WHEN `done_pct` is less than 15%, THE Gantt_Bar SHALL render the percentage label outside the Gantt_Bar to the right
5. THE Gantt_Bar SHALL calculate segment widths proportionally based on `done_pct`, `prog_pct`, and `todo_pct` values from the FeatureItem

### Requirement 5: Today Line Indicator

**User Story:** As a delivery manager, I want a vertical line marking today's date on the timeline, so that I can see at a glance how far through the current PI the team has progressed.

#### Acceptance Criteria

1. THE Today_Line SHALL render as a 2px vertical line using the coral accent color (`#E8622A`)
2. THE Today_Line SHALL be positioned horizontally at `(today - pi_start) / (pi_end - pi_start) * column_width` pixels from the left edge of the active PI_Column
3. THE Today_Line SHALL appear only within the PI_Column that contains the current date
4. WHEN the current date falls outside both PI date ranges, THE Roadmap_Page SHALL not render the Today_Line

### Requirement 6: Team Filtering

**User Story:** As a delivery manager, I want to filter the roadmap by team, so that I can focus on a single team's delivery without visual clutter from other teams.

#### Acceptance Criteria

1. THE Filter_Bar SHALL render filter pill buttons for "All", "Alpha", "Bravo", and "Charlie"
2. WHEN the "All" filter pill is selected, THE Roadmap_Page SHALL display all Team_Groups
3. WHEN a specific team filter pill is selected, THE Roadmap_Page SHALL hide all Team_Groups that do not match the selected team
4. THE Filter_Bar SHALL visually indicate the currently active filter pill with a distinct selected state
5. WHEN a team filter is applied, THE Summary_Strip SHALL update KPI values to reflect only the filtered team

### Requirement 7: Detail Drawer

**User Story:** As a delivery manager, I want to click a feature row to see detailed metadata and AI-generated insights, so that I can investigate delivery risks without leaving the roadmap view.

#### Acceptance Criteria

1. WHEN a Feature_Row is clicked, THE Detail_Drawer SHALL slide in from the right edge with a 200ms animation duration
2. THE Detail_Drawer SHALL have a fixed width of 300px
3. THE Detail_Drawer SHALL display feature metadata including feature key, summary, RAG_Status, and assignee
4. THE Detail_Drawer SHALL display a progress bar showing done, in-progress, and todo percentages
5. THE Detail_Drawer SHALL display a dependency list showing blocker and blocked-by relationships
6. THE Detail_Drawer SHALL display the `lodestar_static` enrichment text in the Lodestar_Panel section
7. WHEN the Escape key is pressed, THE Detail_Drawer SHALL close
8. WHEN the close button (✕) is clicked, THE Detail_Drawer SHALL close
9. WHEN the user clicks outside the Detail_Drawer, THE Detail_Drawer SHALL close
10. WHILE the Detail_Drawer is open, THE Detail_Drawer SHALL trap keyboard focus using the `inert` attribute on background content

### Requirement 8: Sprint Mini-Grid

**User Story:** As a delivery manager, I want to see per-sprint progress indicators within the PI 26.3 column, so that I can identify which sprints carry the most risk for each feature.

#### Acceptance Criteria

1. THE Sprint_Mini_Grid SHALL render 5 mini-bars corresponding to the 5 sprints in PI 26.3 for each feature
2. WHEN a sprint is the active sprint, THE Sprint_Mini_Grid SHALL render the mini-bar using the team color at 55% opacity
3. WHEN a sprint is a future sprint, THE Sprint_Mini_Grid SHALL render the mini-bar using color `#e8e6e0`
4. WHEN a feature has no stories scoped to a sprint, THE Sprint_Mini_Grid SHALL render a diagonal hatch pattern for that sprint's mini-bar

### Requirement 9: Summary Strip

**User Story:** As a delivery manager, I want a quick summary of key metrics at the top of the roadmap, so that I can assess overall program health without scanning every feature row.

#### Acceptance Criteria

1. THE Summary_Strip SHALL display 5 KPI stat cells: total features count, features on track count, features at risk count, total stories count, and blocked features count
2. THE Summary_Strip SHALL calculate "on track" as features with RAG_Status equal to "green"
3. THE Summary_Strip SHALL calculate "at risk" as features with RAG_Status equal to "amber" or "red"
4. THE Summary_Strip SHALL calculate "blocked" as features where the `is_blocked_by` array is non-empty

### Requirement 10: Blocker Flags

**User Story:** As a delivery manager, I want to immediately see which features have cross-team blocking dependencies, so that I can prioritize unblocking actions in stand-ups.

#### Acceptance Criteria

1. WHEN a feature has cross-team blocking dependencies, THE Feature_Row SHALL display a ⚠ Blocker_Flag icon
2. THE Blocker_Flag SHALL appear only for dependencies that cross team boundaries (source team differs from target team)
3. WHEN a Blocker_Flag is clicked, THE Detail_Drawer SHALL open and scroll to the dependency section

### Requirement 11: Accessibility

**User Story:** As a user relying on assistive technology, I want the roadmap to be keyboard-navigable and screen-reader compatible, so that I can access all feature data and interactions.

#### Acceptance Criteria

1. THE Roadmap_Page SHALL render visible keyboard focus indicators on all interactive elements
2. THE Gantt_Bar SHALL include `aria-label` attributes on each segment describing the percentage and category (done, in-progress, todo)
3. WHILE the Detail_Drawer is open, THE Roadmap_Page SHALL apply the `inert` attribute to all background content to enforce focus trapping
4. WHEN the user has `prefers-reduced-motion` enabled, THE Roadmap_Page SHALL disable all animations and transitions
5. THE Roadmap_Page SHALL support sequential keyboard navigation through Feature_Rows using Tab and arrow keys

### Requirement 12: Performance

**User Story:** As a delivery manager, I want the roadmap to load and respond quickly, so that I can use the tool efficiently during live meetings without delays.

#### Acceptance Criteria

1. THE Roadmap_Page SHALL achieve Time to Interactive (TTI) of less than 1500ms on a standard connection
2. THE FeatureItem_API SHALL respond within 300ms for the complete feature set
3. WHEN a team filter is applied, THE Roadmap_Page SHALL complete the filter and visual update within 16ms using CSS-only visibility toggling
4. WHEN the Detail_Drawer opens or closes, THE Detail_Drawer SHALL complete the slide animation within 200ms
