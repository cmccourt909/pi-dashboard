# Requirements: Stakeholder Analysis V2 — UI Enhancement

## Introduction

This spec covers the visual and interactive enhancements to the Stakeholder Analysis page, bringing the existing functional implementation in line with the Northline design mockup. The backend (API, orchestration, SSE streaming, persistence) is already complete. This spec focuses on frontend UI improvements: richer upload experience, KPI summary cards, Lodestar Insights strip, section rail navigation, enhanced data visualizations, and mobile responsiveness.

## Glossary

- **Transcript_Dock**: The enhanced upload component with drag & drop, format support indicators, speaker attribution mode, language selector, and PII toggle.
- **Lodestar_Strip**: An AI-generated summary of the top 3 insights from the analysis, displayed as a dismissible banner above the section content.
- **KPI_Cards**: A row of summary metric cards (stakeholders identified, tier-1 count, critical risks, at-risk dependencies, team health score) derived from analysis results.
- **Section_Rail**: A vertical navigation sidebar listing all 8 sections with status dots (complete/running/error/pending), allowing click-to-scroll or section switching.
- **Voice_Bar**: A horizontal stacked bar showing speaker share-of-voice percentages.
- **Health_Gauge**: A circular SVG gauge showing the overall team health score with color-coded thresholds.
- **Influence_SVG**: An interactive SVG scatter plot showing stakeholders positioned by Power (y-axis) and Interest (x-axis) in a 2×2 quadrant grid.
- **RAID_Tabs**: A tabbed interface for the RAID Log switching between Risks, Assumptions, Issues, and Dependencies.
- **Priority_Columns**: A three-column card layout for Delivery Signals showing P1 Now, P2 Next, and P3 Later.

## Requirements

### Requirement 1: Enhanced Transcript Upload (Transcript Dock)

**User Story:** As a delivery manager, I want a rich upload experience with drag-and-drop, format indicators, and preprocessing options, so that uploading transcripts is effortless.

#### Acceptance Criteria

1. THE Transcript_Dock SHALL support drag-and-drop file upload in addition to click-to-browse.
2. THE Transcript_Dock SHALL accept .vtt, .srt, .txt, and .docx file formats (display accepted formats to user).
3. THE Transcript_Dock SHALL display the selected file name, size, and duration (if parseable from VTT/SRT) in a pill-shaped indicator before upload.
4. THE Transcript_Dock SHALL include a "Speaker attribution" dropdown with options: auto, manual, none.
5. THE Transcript_Dock SHALL include a "Language" dropdown (default: EN).
6. THE Transcript_Dock SHALL include an "Anonymize PII" checkbox (default: checked).
7. THE Transcript_Dock SHALL include a "Use sample transcript" button that loads a built-in demo transcript.
8. THE Transcript_Dock SHALL display a maximum file size indicator (25 MB) and recommended duration (90 minutes).
9. THE Transcript_Dock SHALL show a dashed-border drop zone with an upload icon and instructional text.

### Requirement 2: Lodestar Insights Strip

**User Story:** As a delivery manager, I want to see the top AI-generated insights at a glance after analysis completes, so that I immediately know the key findings.

#### Acceptance Criteria

1. WHEN an Analysis_Session completes, THE Lodestar_Strip SHALL display up to 3 bullet-point insights summarizing the most important findings across all sections.
2. THE Lodestar_Strip SHALL be styled with a blue left border, light-blue background, and the Lodestar icon.
3. THE Lodestar_Strip SHALL include a "View findings" link that scrolls to the relevant section.
4. THE Lodestar_Strip SHALL be hidden when no analysis has been run.

### Requirement 3: KPI Summary Cards

**User Story:** As a delivery manager, I want a summary row of key metrics, so that I can assess the overall analysis outcome at a glance without reading all sections.

#### Acceptance Criteria

1. THE KPI_Cards row SHALL display: Stakeholders identified (count), Tier 1 key players (count), Critical risks (count with "Require attention" subtext), At-risk dependencies (count), Team Health (score/10 with threshold indicator).
2. THE KPI_Cards SHALL update values dynamically based on the completed analysis sections.
3. EACH KPI_Card SHALL use accent colors: indigo for tier-1 count, coral for critical risks, amber for at-risk deps, and coral/amber/teal for health based on threshold.
4. THE KPI_Cards SHALL be hidden until at least one section has completed.

### Requirement 4: Section Rail Navigation

**User Story:** As a delivery manager, I want a persistent side navigation listing all 8 analysis sections with status indicators, so that I can jump between sections without scrolling.

#### Acceptance Criteria

1. THE Section_Rail SHALL display all 8 section labels vertically with their respective icons.
2. EACH section in the rail SHALL show a color-coded status dot: teal (complete), sky/blue (running), amber (warning), coral (error), slate (pending).
3. WHEN a user clicks a section in the rail, THE main content area SHALL display that section's results.
4. THE active section SHALL be highlighted with an indigo background fill.
5. THE Section_Rail SHALL be sticky-positioned so it remains visible while scrolling content.
6. ON viewports below 1024px, THE Section_Rail SHALL stack above the content instead of beside it.

### Requirement 5: Speaker Statistics — Voice Bar Visualization

**User Story:** As a delivery manager, I want a visual bar showing voice distribution, so that I can instantly see who dominated the meeting.

#### Acceptance Criteria

1. THE Speaker Statistics section SHALL display a horizontal stacked bar at the top, with each segment colored per speaker and proportional to their share of voice.
2. BELOW the bar, speakers SHALL be listed in a 2-column grid with avatar (initials), name, role, and percentage.
3. IF the top speaker exceeds 60% share of voice, THE section SHALL display a warning alert: "Voice concentration: High — consider rotating facilitation."

### Requirement 6: Meeting Minutes — Structured Tables

**User Story:** As a delivery manager, I want decisions, commitments, and questions in clean table format, so that outcomes are scannable.

#### Acceptance Criteria

1. THE Meeting Minutes section SHALL display Decisions in a table with columns: Decision, Owner (pill badge).
2. THE Meeting Minutes section SHALL display Commitments in a table with columns: Commitment, Owner (pill badge), Due Date (amber pill badge).
3. THE Meeting Minutes section SHALL display Open Questions in a list with speaker pill and a "Jump to transcript" link per question.
4. Decisions and Commitments tables SHALL be rendered side-by-side on desktop (2-column grid).

### Requirement 7: RAID Log — Tabbed Interface

**User Story:** As a delivery manager, I want to switch between Risks, Assumptions, Issues, and Dependencies using tabs, so that the RAID log is not overwhelming.

#### Acceptance Criteria

1. THE RAID Log section SHALL display a tab strip with 4 tabs: Risks, Assumptions, Issues, Dependencies.
2. EACH tab SHALL show a table with columns: Item, Severity (color-coded pill), Probability/Status, Owner (pill).
3. Severity pills SHALL use: coral/red fill for High, amber fill for Medium, neutral fill for Low.
4. THE default active tab SHALL be "Risks".

### Requirement 8: Delivery Signals — Priority Columns

**User Story:** As a delivery manager, I want action items displayed in prioritized columns, so that I can scan urgency at a glance.

#### Acceptance Criteria

1. THE Delivery Signals section SHALL display three columns: P1 Now (coral header), P2 Next (amber header), P3 Later (neutral header).
2. EACH column SHALL list its action items or show an empty state with "No actions detected" and an icon.
3. IF no P1 actions are detected, THE section SHALL display a Lodestar info note suggesting re-upload with speaker attribution.

### Requirement 9: Team Health — Gauge Visualization

**User Story:** As a delivery manager, I want the team health score displayed as a visual gauge with sub-dimensions, so that I can assess strengths and weaknesses.

#### Acceptance Criteria

1. THE Team Health section SHALL display a circular SVG gauge showing the overall score (1-10) with color coding: coral (<5), amber (5-7), teal (>7).
2. BESIDE the gauge, THE section SHALL display 4 horizontal progress bars for sub-dimensions: Voice Concentration, Facilitation Effectiveness, Blocker Surfacing, Agile Maturity (each scored /10).
3. BELOW the gauge and bars, THE section SHALL display a Lodestar recommendation paragraph with improvement suggestions.
4. THE gauge SVG SHALL render as a ring with partial fill based on the score.

### Requirement 10: Empathy Map — Stakeholder Switcher

**User Story:** As a delivery manager, I want to switch between stakeholders' empathy maps, so that I can review each person's perspective.

#### Acceptance Criteria

1. THE Empathy Map section SHALL display a row of stakeholder buttons (pills) that toggle which empathy map is shown.
2. THE empathy map grid SHALL show 6 cells: Says, Thinks, Does, Feels (2×2 grid), plus Pains and Gains (2-column row below).
3. EACH quadrant SHALL have a colored header label and bullet-point content.
4. Pains SHALL have a coral/danger background. Gains SHALL have a teal/success background.

### Requirement 11: Stakeholder Register — Table + SVG Influence Map

**User Story:** As a delivery manager, I want a register table with tier badges and an interactive scatter plot influence map, so that I can understand power dynamics visually.

#### Acceptance Criteria

1. THE Stakeholder Register section SHALL display a table with columns: Stakeholder (with avatar initials), Tier (color-coded pill), Power (0-1), Interest (0-1), Engagement strategy (pill).
2. Tier pill colors SHALL be: Tier 1 indigo, Tier 2 sky/blue, Tier 3 amber, Tier 4 neutral/slate.
3. BELOW the table, THE section SHALL display an SVG influence map (400×320 viewbox) with quadrant labels: Key Players (top-right), Keep Satisfied (top-left), Keep Informed (bottom-right), Monitor (bottom-left).
4. EACH stakeholder SHALL be rendered as a colored circle positioned by their Power (y-axis) and Interest (x-axis) values, with a name label.
5. Quadrants SHALL be divided by dashed lines at the midpoints.

### Requirement 12: Section Actions — Copy & Regenerate

**User Story:** As a delivery manager, I want copy and regenerate buttons on each section, so that I can quickly share content or refresh a single section.

#### Acceptance Criteria

1. EACH section panel SHALL include a Copy icon button in the header that copies the section content to clipboard.
2. EACH section panel SHALL include a Regenerate icon button in the header that triggers single-section regeneration.
3. Buttons SHALL be styled as icon-only with slate color and hover background.

### Requirement 13: Mobile & Responsive Layout

**User Story:** As a user on a tablet or phone, I want the stakeholder analysis page to be usable on smaller screens.

#### Acceptance Criteria

1. ON viewports below 768px, THE page SHALL hide the left sidebar and show a mobile bottom navigation bar.
2. THE mobile bottom nav SHALL display 5 items: Overview, Features, Roadmap, Stakeholders, Findings.
3. THE Section_Rail SHALL collapse to a horizontal scrollable row on mobile.
4. All tables SHALL be horizontally scrollable on narrow viewports.
5. Grid layouts (Decisions/Commitments, Empathy Map) SHALL stack to single column below 640px.

### Requirement 14: Visual Design Compliance

**User Story:** As a user of Northline, I want the enhanced page to match the design system precisely.

#### Acceptance Criteria

1. ALL components SHALL use the Northline color tokens: deep-indigo (#202670), indigo (#4C4088), sky (#1D6EFF), teal (#0F6038), amber (#F5A623), coral (#E85D46), slate (#847488), stone (#F2F4F6), ink (#0E0E1A).
2. Cards SHALL use white background, border-radius 8px, and shadow-card.
3. Pill badges SHALL use radius-pill (999px) with fill-* background colors.
4. Typography SHALL use Inter font with weights 400/500/600/700.
5. Icons SHALL use Tabler icon paths at size 16-20 with stroke-width 1.75.
