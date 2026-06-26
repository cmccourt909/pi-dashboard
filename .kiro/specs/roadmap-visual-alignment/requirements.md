# Requirements Document

## Introduction

This feature aligns the existing WaypointPI roadmap page visual presentation with a specific HTML reference design. The roadmap page already has working components (GanttBar, GanttHeader, FilterBar, SummaryStrip, Sidebar, TeamGroup, FeatureRow, SprintMiniGrid, BlockerFlag, DetailDrawer, TodayLine) implementing the core data logic. This spec captures the visual and layout refinements needed to match the reference design exactly — including layout structure, spacing, colors, typography, component arrangement, and missing UI elements.

## Glossary

- **Roadmap_Page**: The top-level page component at `/roadmap` that composes all roadmap sub-components
- **Nav_Bar**: The application-level top navigation header rendered in the root layout
- **Page_Header**: A new section below the Nav_Bar displaying the page title, subtitle metadata line, and team filter pills
- **Filter_Pills**: Horizontal row of selectable pill buttons for filtering teams, rendered within the Page_Header
- **KPI_Strip**: A horizontal row of 5 metric cards displayed above the Gantt chart area
- **Sidebar**: The fixed-width left column displaying team groups and feature labels
- **Team_Group_Header**: A row in both the Sidebar and Gantt area identifying a team section with icon and metadata
- **Feature_Row**: A single row in the Gantt area representing one feature's progress
- **Gantt_Header**: The timeline header showing PI names, date ranges, and sprint labels
- **Sprint_Mini_Grid**: Five mini-bars in the PI 26.3 column representing sprint-level story breakdown
- **Today_Line**: Vertical coral/orange line marking the current date position
- **Legend_Bar**: A footer bar explaining the color coding and interaction hints
- **RAG_Status_Dot**: A small colored circle (green/amber/red) indicating feature health
- **Team_Letter_Icon**: A circular badge containing a Greek letter (α, β, γ) identifying a team
- **Design_Tokens**: The set of color, spacing, and typography values defining the visual language

## Requirements

### Requirement 1: Navigation Bar Branding Alignment

**User Story:** As a user, I want the navigation bar to display "WaypointPI" branding with a "Lodestar active" indicator, so that the app identity matches the reference design.

#### Acceptance Criteria

1. THE Nav_Bar SHALL display the text "WaypointPI" as the application brand name in white at 15px font weight 600
2. THE Nav_Bar SHALL use background color #1e293b (dark navy)
3. THE Nav_Bar SHALL display a "Lodestar active" status indicator containing a green dot (8px diameter, #10b981) followed by the text "Lodestar active" in 12px white text
4. THE Nav_Bar SHALL display navigation links in the order: PI Health, Roadmap, Findings, SteerCo, Admin
5. WHEN a navigation link matches the current page, THE Nav_Bar SHALL render that link in solid white; otherwise links SHALL render at 55% white opacity

### Requirement 2: Page Header Section

**User Story:** As a user, I want a clear page title and contextual subtitle above the roadmap, so that I can quickly identify the page and understand the current data scope.

#### Acceptance Criteria

1. THE Page_Header SHALL display the title "Program Roadmap" in 24px font weight 700 color #1e293b
2. THE Page_Header SHALL display a subtitle line below the title containing: organization name, PI range (e.g. "PI 26.2 → 26.3"), team count, feature count, and "As of" date — separated by " · " delimiters
3. THE Page_Header subtitle SHALL use 13px font weight 400 color #64748b
4. THE Page_Header SHALL render below the Nav_Bar and above the Filter_Pills with 24px top padding and 16px bottom padding

### Requirement 3: Filter Pill Label Format

**User Story:** As a user, I want filter pill labels to include the word "Team" prefix (except for "All teams"), so that the filter purpose is immediately clear.

#### Acceptance Criteria

1. THE Filter_Pills SHALL display labels as: "All teams", "Team Alpha", "Team Bravo", "Team Charlie"
2. WHEN a pill is in active state, THE Filter_Pills SHALL render the pill with indigo (#4f46e5) background, white text, and 1px solid indigo border
3. WHEN a pill is in inactive state, THE Filter_Pills SHALL render the pill with transparent background, color #334155, and 1px solid #cbd5e1 border
4. THE Filter_Pills SHALL render within the Page_Header section below the subtitle line

### Requirement 4: KPI Summary Strip Card Layout

**User Story:** As a user, I want KPI metrics displayed as distinct cards with title, primary value, and descriptive subtitle, so that I can quickly scan program health at a glance.

#### Acceptance Criteria

1. THE KPI_Strip SHALL display 5 cards in a horizontal row with equal spacing
2. WHEN rendered, each KPI card SHALL display three lines: a title label (12px uppercase #64748b), a primary value (28px font weight 700 #1e293b), and a subtitle description (11px #94a3b8)
3. THE KPI_Strip SHALL display the following cards in order: "Active PI" (value: current PI name, subtitle: PI start date), "Features in flight" (value: feature count, subtitle: team count), "PI completion" (value: done percentage, subtitle: sprint target context), "Blockers" (value: blocker count, subtitle: "Cross-team dependencies"), "Unestimated stories" (value: unestimated percentage, subtitle: "Flagged by rule engine")
4. THE KPI_Strip cards SHALL have white background, border-radius 8px, and subtle box-shadow (0 1px 3px rgba(0,0,0,0.08))
5. THE KPI_Strip SHALL have a light gray background (#f8fafc) behind the card row with 16px vertical padding

### Requirement 5: Sidebar Team Section Design

**User Story:** As a user, I want the sidebar team sections to show team letter icons and feature metadata, so that I can visually identify teams and understand their scope.

#### Acceptance Criteria

1. THE Sidebar SHALL have a fixed width of 200px with white background and right border of 1px solid #e2e8f0
2. WHEN a team section header is rendered, THE Sidebar SHALL display a Team_Letter_Icon (circular 28px badge) followed by the team name and metadata text showing feature count and sprint count
3. THE Team_Letter_Icon SHALL use the team color as background (Alpha: #6366f1, Bravo: #10b981, Charlie: #d97706) with white letter (α for Alpha, β for Bravo, γ for Charlie) at 14px font weight 600
4. WHEN a feature label is rendered in the Sidebar, THE Sidebar SHALL display a RAG_Status_Dot (8px diameter circle) in the feature's RAG color (green: #10b981, amber: #f59e0b, red: #ef4444) followed by the feature name
5. THE Sidebar feature labels SHALL be truncated with ellipsis when exceeding available width

### Requirement 6: Team Group Header in Gantt Area

**User Story:** As a user, I want team group headers in the Gantt area to display a team letter icon and RAG status badge, so that I can quickly identify team sections and their health.

#### Acceptance Criteria

1. WHEN a team group header is rendered in the Gantt area, THE Team_Group_Header SHALL display the Team_Letter_Icon, team name in 13px font weight 600, and a RAG status badge
2. THE RAG status badge SHALL display as a pill with text "On Track" (green background #dcfce7, text #166534), "At Risk" (amber background #fef3c7, text #92400e), or "Blocked" (red background #fee2e2, text #991b1b) based on the team's aggregate status
3. THE Team_Group_Header SHALL have light gray background (#f8fafc) and bottom border of 1px solid #e2e8f0
4. WHEN the team group is collapsed, THE Team_Group_Header SHALL display a right-pointing chevron; when expanded, a downward-pointing chevron

### Requirement 7: Feature Row Layout in Gantt Area

**User Story:** As a user, I want each feature row to display the feature name and key alongside the Gantt bar, so that I can identify features without relying solely on the sidebar.

#### Acceptance Criteria

1. WHEN a feature row is rendered in the PI 26.2 column, THE Feature_Row SHALL display the feature name (13px #334155) and feature key label (11px #64748b) to the left of the Gantt bar
2. WHEN a feature row is rendered in the PI 26.3 column, THE Feature_Row SHALL display the Sprint_Mini_Grid followed by the current sprint name label (10px #64748b)
3. IF a feature has no stories scoped to PI 26.3, THEN THE Feature_Row SHALL display "No PI 26.3 scope" in 11px italic #94a3b8 instead of the Sprint_Mini_Grid
4. THE Feature_Row SHALL have 8px vertical padding and a hover background of #f8fafc
5. WHEN a feature has cross-team blockers, THE Feature_Row SHALL display the BlockerFlag icon (⚠) adjacent to the Gantt bar with 4px left margin

### Requirement 8: Gantt Header Sprint Labels and Active Sprint Indicator

**User Story:** As a user, I want the Gantt header to show clear sprint labels with an active sprint marker, so that I can orient myself in the timeline.

#### Acceptance Criteria

1. THE Gantt_Header SHALL display the PI name, followed by the date range (e.g. "May 21 – Aug 5") in 11px #64748b below the PI name
2. THE Gantt_Header SHALL display sprint labels using the format "26.2.1", "26.2.2" etc. in equally-spaced bands
3. WHEN a sprint is the active sprint, THE Gantt_Header SHALL display a "▶" arrow indicator (color matching the team color or #4f46e5 indigo) before or above the sprint label
4. THE Gantt_Header sprint bands SHALL use #e8edf5 background with 3px border-radius and 10px font size

### Requirement 9: Legend Bar

**User Story:** As a user, I want a legend bar at the bottom of the roadmap, so that I can understand the color coding and available interactions.

#### Acceptance Criteria

1. THE Legend_Bar SHALL render at the bottom of the roadmap page below all Gantt content
2. THE Legend_Bar SHALL display legend entries for: Done (teal #0d9488 square), In progress (blue rgba(59,130,246,0.6) square), To do (gray rgba(156,163,175,0.4) square), Today (coral #E8622A vertical line), Blocker (⚠ icon)
3. THE Legend_Bar SHALL display helper text: "Click any feature row to inspect · sprints shown as mini-bars in PI 26.3" in 12px #64748b
4. THE Legend_Bar SHALL have top border of 1px solid #e2e8f0, padding 12px 16px, and white background

### Requirement 10: Design Token Alignment

**User Story:** As a user, I want the roadmap to use consistent visual tokens matching the reference design, so that the interface feels cohesive and polished.

#### Acceptance Criteria

1. THE Roadmap_Page SHALL use the following team colors: Alpha (#6366f1 indigo), Bravo (#10b981 green), Charlie (#d97706 orange)
2. THE Roadmap_Page SHALL use the following Gantt segment colors: done (#0d9488 teal), in-progress (rgba(59,130,246,0.6) blue), todo (rgba(156,163,175,0.4) gray)
3. THE Roadmap_Page SHALL use #e2e8f0 for all structural borders
4. THE Roadmap_Page SHALL use the Today_Line color #E8622A (coral/orange) with 2px width
5. THE Roadmap_Page SHALL use sans-serif font stack with clean typography: section labels in uppercase 11-12px with 0.04-0.06em letter spacing
6. THE Roadmap_Page card elements SHALL use white background with box-shadow 0 1px 3px rgba(0,0,0,0.08) and border-radius 6-8px

### Requirement 11: Layout Structure and Spacing

**User Story:** As a user, I want the overall layout to follow the reference page structure precisely, so that information density and visual hierarchy match the design.

#### Acceptance Criteria

1. THE Roadmap_Page layout SHALL follow this vertical order: Nav_Bar → Page_Header (title + subtitle + Filter_Pills) → KPI_Strip → Gantt_Header → Sidebar + Gantt columns → Legend_Bar
2. THE Sidebar SHALL remain fixed at 200px width to the left of the Gantt scrollable area
3. THE Gantt columns SHALL each have a minimum width ensuring sprint bands are readable (at least 400px per PI column)
4. THE Roadmap_Page SHALL use #ffffff (white) as the primary background with #f8fafc for section header backgrounds
5. WHILE the page width is less than the total content width, THE Roadmap_Page SHALL enable horizontal scrolling for the Sidebar + Gantt area container
