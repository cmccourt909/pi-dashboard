# Requirements Document

## Introduction

The Command Center V2 redesigns the Northline Delivery Intelligence overview page. The primary changes are: replacing the left sidebar navigation with a horizontal top navigation bar, adding a large Lodestar AI briefing panel with narrative insights, presenting a KPI strip with five metric cards, and reorganizing the page into a two-column layout with findings/attention items on the left and PI health on the right, followed by a bottom section with recent findings and quick navigation. The visual design uses existing Northline design tokens (deep-indigo, indigo, sky, teal, amber, coral, slate, stone).

## Glossary

- **Top_Navigation_Bar**: A fixed horizontal navigation bar replacing the AppSidebar, using a deep-indigo (#202670) background with horizontal nav links and user profile
- **Lodestar_Briefing_Panel**: A large AI-generated narrative section displaying portfolio briefing content, action buttons, and version metadata
- **KPI_Strip**: A horizontal row of five metric cards displaying key program indicators
- **Needs_Attention_Section**: A left-column section showing critical findings with severity, description, AI recommendations, and action buttons
- **PI_Health_Section**: A right-column section showing Program Increment progress bars and team health indicators
- **Quick_Navigation_Grid**: A grid of navigation cards providing links to Roadmap, Forecast, Features, and Findings pages
- **Overview_Page**: The main Command Center page rendered at the root route (/)
- **User_Profile_Block**: The user avatar and name displayed on the right side of the Top_Navigation_Bar

## Requirements

### Requirement 1: Top Navigation Bar Replaces Sidebar

**User Story:** As a user, I want a horizontal top navigation bar instead of the left sidebar, so that more horizontal screen space is available for content.

#### Acceptance Criteria

1. WHEN the Overview_Page loads, THE Top_Navigation_Bar SHALL render as a fixed horizontal bar at the top of the viewport with a deep-indigo (#202670) background
2. THE Top_Navigation_Bar SHALL display the Northline compass mark and "NORTHLINE DELIVERY INTELLIGENCE" text on the left side
3. THE Top_Navigation_Bar SHALL display horizontal navigation links: Overview, Features, Roadmap, Forecast, Findings, Admin
4. WHEN a navigation link corresponds to the current route, THE Top_Navigation_Bar SHALL highlight that link with a visually distinct active state
5. THE Top_Navigation_Bar SHALL display a User_Profile_Block on the right side showing the user avatar (initials) and user name
6. WHEN the Overview_Page renders, THE Overview_Page SHALL NOT render the AppSidebar component
7. THE Top_Navigation_Bar SHALL occupy the full viewport width and remain fixed during scroll

### Requirement 2: Program Overview Header

**User Story:** As a program manager, I want to see a program overview header with sync status and timestamp, so that I know when data was last refreshed.

#### Acceptance Criteria

1. WHEN the Overview_Page loads, THE Overview_Page SHALL display a program overview header section below the Top_Navigation_Bar
2. THE Overview_Page SHALL display a sync status indicator showing the last data synchronization timestamp
3. WHEN data synchronization is in progress, THE Overview_Page SHALL display a visual indicator that sync is active

### Requirement 3: Lodestar AI Briefing Panel

**User Story:** As a program leader, I want to see an AI-generated narrative briefing on the overview page, so that I can quickly understand program status and recommended actions.

#### Acceptance Criteria

1. WHEN the Overview_Page loads, THE Lodestar_Briefing_Panel SHALL render below the program overview header
2. THE Lodestar_Briefing_Panel SHALL display a version badge showing "Lodestar AI", the version number, and "Portfolio briefing" label
3. THE Lodestar_Briefing_Panel SHALL display an update timestamp indicating when the briefing was last generated
4. THE Lodestar_Briefing_Panel SHALL display a key headline summarizing the most critical program state (e.g., PI risk status and attention items)
5. THE Lodestar_Briefing_Panel SHALL display one or more paragraphs of AI-generated narrative with insights and recommendations
6. THE Lodestar_Briefing_Panel SHALL display three action buttons: "Generate SteerCo briefing", "Refresh analysis", and "Copy"
7. WHEN the user clicks "Refresh analysis", THE Lodestar_Briefing_Panel SHALL request a new AI-generated briefing and update the content
8. WHEN the user clicks "Copy", THE Lodestar_Briefing_Panel SHALL copy the briefing text to the system clipboard
9. WHEN the user clicks "Generate SteerCo briefing", THE Lodestar_Briefing_Panel SHALL initiate generation of a formatted executive briefing document

### Requirement 4: KPI Strip

**User Story:** As a program leader, I want to see five key metrics at a glance, so that I can assess overall program health without scrolling.

#### Acceptance Criteria

1. WHEN the Overview_Page loads, THE KPI_Strip SHALL render a horizontal row of five metric cards below the Lodestar_Briefing_Panel
2. THE KPI_Strip SHALL display a "Sprint velocity" card showing the current velocity in points and a delta value compared to plan
3. THE KPI_Strip SHALL display a "Features on track" card showing the count of on-track features out of total features and a delta value
4. THE KPI_Strip SHALL display an "Active blockers" card showing the blocker count and a delta value
5. THE KPI_Strip SHALL display a "Days remaining" card showing the number of days remaining and the PI end date
6. THE KPI_Strip SHALL display a "Forecast confidence" card showing a percentage value and "Monte Carlo P50" label
7. WHEN a delta value is negative (worsening), THE KPI_Strip SHALL display the delta in a danger color (coral)
8. WHEN a delta value is positive (improving), THE KPI_Strip SHALL display the delta in a success color (teal)

### Requirement 5: Needs Attention Section

**User Story:** As a program leader, I want to see findings that need immediate attention with AI recommendations, so that I can take action on critical issues.

#### Acceptance Criteria

1. WHEN the Overview_Page loads, THE Needs_Attention_Section SHALL render in the left column below the KPI_Strip
2. THE Needs_Attention_Section SHALL display findings sorted by severity (critical first, then warning)
3. FOR EACH finding, THE Needs_Attention_Section SHALL display a severity badge, title, and description
4. FOR EACH finding, THE Needs_Attention_Section SHALL display a Lodestar AI recommendation with a suggested action
5. FOR EACH finding, THE Needs_Attention_Section SHALL display action buttons to address or dismiss the finding
6. WHEN no findings require attention, THE Needs_Attention_Section SHALL display a message indicating all items are addressed

### Requirement 6: Program Increment Health Section

**User Story:** As a program leader, I want to see PI progress and team health in one glance, so that I can identify teams that need support.

#### Acceptance Criteria

1. WHEN the Overview_Page loads, THE PI_Health_Section SHALL render in the right column adjacent to the Needs_Attention_Section
2. THE PI_Health_Section SHALL display progress bars showing completion percentage for the current PI
3. THE PI_Health_Section SHALL display team health indicators with a status color (teal for healthy, amber for at-risk, coral for critical)
4. FOR EACH team, THE PI_Health_Section SHALL display the team name and a health status indicator
5. WHEN a team health status is critical, THE PI_Health_Section SHALL visually emphasize that team entry

### Requirement 7: Bottom Section — Recent Findings and Quick Navigation

**User Story:** As a user, I want to see recent findings and quick navigation links at the bottom of the overview, so that I can quickly navigate to other sections or review recent activity.

#### Acceptance Criteria

1. WHEN the Overview_Page loads, THE Overview_Page SHALL display a bottom two-column layout below the Needs_Attention_Section and PI_Health_Section
2. THE Overview_Page SHALL display a "Recent findings" list in the left column of the bottom section with severity badges and finding titles
3. THE Overview_Page SHALL display an executive briefing call-to-action in the right column of the bottom section
4. THE Quick_Navigation_Grid SHALL display four navigation cards: Roadmap, Forecast, Features, and Findings
5. WHEN a user clicks a Quick_Navigation_Grid card, THE Overview_Page SHALL navigate to the corresponding page

### Requirement 8: Visual Design Compliance

**User Story:** As a designer, I want the Command Center V2 to use Northline design tokens consistently, so that the page is visually cohesive with the rest of the platform.

#### Acceptance Criteria

1. THE Overview_Page SHALL use existing Northline CSS custom properties for all colors, spacing, radii, and shadows
2. THE Overview_Page SHALL render cards with box-shadow (--shadow-card) and border-radius (--radius-lg or --radius-md)
3. THE Overview_Page SHALL use pill-shaped badges (--radius-pill) for severity and status indicators
4. THE Overview_Page SHALL use progress bars with appropriate status colors (teal for on-track, amber for at-risk, coral for critical)
5. THE Overview_Page SHALL render a footer containing "Powered by Lodestar AI" text and the compass mark icon

### Requirement 9: Responsive Layout

**User Story:** As a user, I want the Command Center V2 to remain usable on smaller screens, so that I can access the overview on tablets or narrow browser windows.

#### Acceptance Criteria

1. WHEN the viewport width is below 1024px, THE Overview_Page SHALL stack the two-column sections into a single column layout
2. WHEN the viewport width is below 768px, THE KPI_Strip SHALL wrap metric cards into a multi-row grid
3. WHEN the viewport width is below 768px, THE Top_Navigation_Bar SHALL collapse navigation links into a mobile menu or bottom navigation

### Requirement 10: Data Integration

**User Story:** As a developer, I want the Command Center V2 to fetch data from existing API endpoints, so that the page displays live program data.

#### Acceptance Criteria

1. WHEN the Overview_Page loads, THE Overview_Page SHALL fetch PI data from the /api/pis endpoint
2. WHEN the Overview_Page loads, THE Overview_Page SHALL fetch findings data from the /api/findings endpoint
3. WHEN the Overview_Page loads, THE Lodestar_Briefing_Panel SHALL fetch narrative content from the /api/narrative endpoint
4. IF the API returns an error, THEN THE Overview_Page SHALL display a non-blocking error message indicating the failure
5. WHILE data is being fetched, THE Overview_Page SHALL display loading skeleton placeholders for each content section
