# Requirements Document

## Introduction

The Stakeholder Analysis feature adds a new top-level page (`/stakeholders`) to the Northline delivery intelligence platform. The page integrates with the existing Lodestar AI infrastructure to analyze uploaded meeting transcripts and produce comprehensive stakeholder intelligence across eight analysis sections. Results stream in real-time via SSE, are persisted for future reference, and can be exported.

## Glossary

- **Stakeholder_Analysis_Page**: The top-level frontend page at `/stakeholders` that provides the user interface for transcript upload, analysis triggering, and results display.
- **Transcript**: A plain-text meeting transcript file (.txt format) uploaded by the user, containing speaker-attributed dialogue.
- **Analysis_Engine**: The backend service that orchestrates the eight sequential AI analysis prompts against an uploaded transcript using the Lodestar AI adapter infrastructure.
- **Analysis_Session**: A single end-to-end run of all eight analysis sections against one uploaded transcript, persisted as a unit with a unique identifier.
- **Speaker_Statistics_Section**: The analysis output that parses the transcript to identify speakers, utterance counts, word counts, share of voice percentages, interaction pairs, silent participants, and concentration ratio.
- **Meeting_Minutes_Section**: The analysis output that extracts decisions, commitments, and open questions from the transcript.
- **RAID_Log_Section**: The analysis output that identifies Risks, Assumptions, Issues, and Dependencies with severity, probability, and impact ratings.
- **Delivery_Signals_Section**: The analysis output that classifies action items into P1 (Immediate), P2 (This Sprint), and P3 (Track & Monitor) priority tiers.
- **Team_Health_Section**: The analysis output that assesses voice concentration, facilitation effectiveness, blocker surfacing, agile maturity signals, and an overall health score (1-10).
- **Gap_Analysis_Section**: The analysis output that identifies teams not present, topics not discussed, and questions that should have been asked.
- **Empathy_Map_Section**: The analysis output that generates Thinks/Feels/Says/Does/Pains/Gains quadrants for 1-2 key stakeholders.
- **Stakeholder_Register_Section**: The analysis output that produces a tiered stakeholder register (4 tiers) with a Power/Interest influence map.
- **Lodestar_Adapter**: The existing LLM adapter infrastructure (Azure OpenAI, OpenAI, Claude) that provides streaming text generation via async generators.
- **SSE_Stream**: Server-Sent Events stream used to deliver real-time AI generation output to the frontend.
- **Export_Service**: The component responsible for converting analysis results into downloadable formats (Markdown, clipboard text).

## Requirements

### Requirement 1: Transcript Upload

**User Story:** As a delivery manager, I want to upload a meeting transcript file, so that the system can analyze it for stakeholder intelligence.

#### Acceptance Criteria

1. WHEN a user selects a .txt file via the file input, THE Stakeholder_Analysis_Page SHALL display the file name and size before upload confirmation.
2. WHEN a user confirms the upload, THE Stakeholder_Analysis_Page SHALL transmit the file to the Analysis_Engine via a multipart form POST request.
3. WHEN the Analysis_Engine receives a valid .txt file, THE Analysis_Engine SHALL store the transcript content and return a unique Analysis_Session identifier.
4. IF the uploaded file exceeds 5 MB in size, THEN THE Analysis_Engine SHALL reject the upload with a descriptive error message.
5. IF the uploaded file is not a supported format (.txt), THEN THE Analysis_Engine SHALL reject the upload with an error indicating the accepted formats.
6. IF the uploaded file contains no recognizable speaker-attributed text, THEN THE Analysis_Engine SHALL accept the file but display a warning that results may be limited.

### Requirement 2: Analysis Orchestration

**User Story:** As a delivery manager, I want the system to run all eight analysis prompts against my transcript, so that I get comprehensive stakeholder intelligence without manual effort.

#### Acceptance Criteria

1. WHEN an Analysis_Session is created, THE Analysis_Engine SHALL execute all eight analysis prompts against the stored transcript.
2. THE Analysis_Engine SHALL execute independent analysis sections in parallel where no data dependency exists between sections.
3. WHILE an Analysis_Session is in progress, THE Stakeholder_Analysis_Page SHALL display a progress indicator showing which sections are complete, in progress, or pending.
4. IF one analysis section fails, THEN THE Analysis_Engine SHALL continue processing the remaining sections and mark the failed section with an error state.
5. WHEN all eight sections complete or fail, THE Analysis_Engine SHALL mark the Analysis_Session as complete with a final status.

### Requirement 3: Real-Time Streaming Output

**User Story:** As a delivery manager, I want to see AI-generated analysis appear in real-time as it is generated, so that I do not have to wait for all sections to finish before reviewing results.

#### Acceptance Criteria

1. WHEN the Analysis_Engine begins generating a section, THE Analysis_Engine SHALL open an SSE_Stream to deliver text chunks to the Stakeholder_Analysis_Page.
2. WHILE an SSE_Stream is active for a section, THE Stakeholder_Analysis_Page SHALL render incoming text chunks incrementally in the corresponding section panel.
3. WHEN the SSE_Stream emits a done event for a section, THE Stakeholder_Analysis_Page SHALL mark that section as complete and display the full result.
4. IF the SSE_Stream connection is interrupted, THEN THE Stakeholder_Analysis_Page SHALL display a retry option for the affected section.

### Requirement 4: Speaker Statistics Analysis

**User Story:** As a delivery manager, I want speaker statistics extracted from the transcript, so that I can understand participation patterns and voice distribution.

#### Acceptance Criteria

1. WHEN the Speaker_Statistics_Section is generated, THE Analysis_Engine SHALL identify each unique speaker in the transcript.
2. WHEN the Speaker_Statistics_Section is generated, THE Analysis_Engine SHALL calculate utterance count, word count, and share of voice percentage for each speaker.
3. WHEN the Speaker_Statistics_Section is generated, THE Analysis_Engine SHALL identify the top interaction pairs (speakers who respond to each other most frequently).
4. WHEN the Speaker_Statistics_Section is generated, THE Analysis_Engine SHALL flag silent participants (speakers with share of voice below 5%).
5. WHEN the Speaker_Statistics_Section is generated, THE Analysis_Engine SHALL compute a concentration ratio indicating how evenly voice is distributed.

### Requirement 5: Meeting Minutes and Decision Log

**User Story:** As a delivery manager, I want decisions, commitments, and open questions extracted from the transcript, so that I have a clear record of meeting outcomes.

#### Acceptance Criteria

1. WHEN the Meeting_Minutes_Section is generated, THE Analysis_Engine SHALL extract decisions as a table with columns: Decision, Owner, Context.
2. WHEN the Meeting_Minutes_Section is generated, THE Analysis_Engine SHALL extract commitments as a table with columns: Commitment, Owner, Due Date (if mentioned).
3. WHEN the Meeting_Minutes_Section is generated, THE Analysis_Engine SHALL extract open questions as a list with the speaker who raised each question.

### Requirement 6: RAID Log Generation

**User Story:** As a delivery manager, I want risks, assumptions, issues, and dependencies identified from the transcript, so that I can proactively manage delivery threats.

#### Acceptance Criteria

1. WHEN the RAID_Log_Section is generated, THE Analysis_Engine SHALL categorize extracted items into four tables: Risks, Assumptions, Issues, and Dependencies.
2. WHEN the RAID_Log_Section is generated, THE Analysis_Engine SHALL assign a severity rating (High, Medium, Low) to each Risk and Issue.
3. WHEN the RAID_Log_Section is generated, THE Analysis_Engine SHALL assign a probability rating (High, Medium, Low) to each Risk.
4. WHEN the RAID_Log_Section is generated, THE Analysis_Engine SHALL assign an impact rating (High, Medium, Low) to each Dependency.

### Requirement 7: Delivery Signals and Action Queue

**User Story:** As a delivery manager, I want action items classified by priority, so that I can focus the team on the most urgent work first.

#### Acceptance Criteria

1. WHEN the Delivery_Signals_Section is generated, THE Analysis_Engine SHALL classify each identified action item into one of three priority tiers: P1 (Immediate), P2 (This Sprint), or P3 (Track & Monitor).
2. WHEN the Delivery_Signals_Section is generated, THE Analysis_Engine SHALL include the action description, assigned owner (if mentioned), and classification rationale for each item.
3. THE Stakeholder_Analysis_Page SHALL display P1 items with visual emphasis distinguishing them from P2 and P3 items.

### Requirement 8: Team Health and Agile Maturity Assessment

**User Story:** As a delivery manager, I want an assessment of team health and agile maturity from the meeting dynamics, so that I can identify facilitation improvements.

#### Acceptance Criteria

1. WHEN the Team_Health_Section is generated, THE Analysis_Engine SHALL compute a voice concentration analysis indicating dominance patterns.
2. WHEN the Team_Health_Section is generated, THE Analysis_Engine SHALL assess facilitation effectiveness and provide a score.
3. WHEN the Team_Health_Section is generated, THE Analysis_Engine SHALL identify blocker surfacing behavior (whether blockers were raised and addressed).
4. WHEN the Team_Health_Section is generated, THE Analysis_Engine SHALL identify agile maturity signals from the meeting dynamics.
5. WHEN the Team_Health_Section is generated, THE Analysis_Engine SHALL produce an overall team health score from 1 to 10.

### Requirement 9: Gap Analysis

**User Story:** As a delivery manager, I want to know what was missing from the meeting, so that I can address blind spots in the next session.

#### Acceptance Criteria

1. WHEN the Gap_Analysis_Section is generated, THE Analysis_Engine SHALL identify teams or roles that were not represented in the meeting.
2. WHEN the Gap_Analysis_Section is generated, THE Analysis_Engine SHALL identify topics that were expected but not discussed (based on context clues in the transcript).
3. WHEN the Gap_Analysis_Section is generated, THE Analysis_Engine SHALL suggest questions that should have been asked based on the topics discussed.

### Requirement 10: Stakeholder Empathy Map

**User Story:** As a delivery manager, I want empathy maps for key stakeholders, so that I can better understand their perspectives and motivations.

#### Acceptance Criteria

1. WHEN the Empathy_Map_Section is generated, THE Analysis_Engine SHALL select 1-2 key stakeholders based on influence and activity level in the transcript.
2. WHEN the Empathy_Map_Section is generated, THE Analysis_Engine SHALL produce a six-quadrant empathy map (Thinks, Feels, Says, Does, Pains, Gains) for each selected stakeholder.
3. THE Stakeholder_Analysis_Page SHALL display each empathy map in a visual grid layout with labeled quadrants.

### Requirement 11: Stakeholder Register

**User Story:** As a delivery manager, I want a tiered stakeholder register with influence mapping, so that I can prioritize engagement strategies.

#### Acceptance Criteria

1. WHEN the Stakeholder_Register_Section is generated, THE Analysis_Engine SHALL classify each identified stakeholder into one of four tiers based on their influence and interest level.
2. WHEN the Stakeholder_Register_Section is generated, THE Analysis_Engine SHALL produce a Power/Interest influence map positioning each stakeholder.
3. THE Stakeholder_Analysis_Page SHALL display the influence map as a 2x2 quadrant visualization (High Power/High Interest, High Power/Low Interest, Low Power/High Interest, Low Power/Low Interest).

### Requirement 12: Analysis Persistence

**User Story:** As a delivery manager, I want past analyses saved and accessible, so that I can revisit results without re-running the AI processing.

#### Acceptance Criteria

1. WHEN an Analysis_Session completes, THE Analysis_Engine SHALL persist all section results to the database associated with the session identifier.
2. WHEN a user navigates to the Stakeholder_Analysis_Page, THE Stakeholder_Analysis_Page SHALL display a list of past Analysis_Sessions with timestamps and transcript file names.
3. WHEN a user selects a past Analysis_Session, THE Stakeholder_Analysis_Page SHALL load and display all persisted section results without triggering new AI generation.
4. THE Analysis_Engine SHALL retain persisted Analysis_Sessions indefinitely until explicitly deleted by the user.

### Requirement 13: Section-Level Regeneration

**User Story:** As a delivery manager, I want to regenerate individual sections without re-running the entire analysis, so that I can refresh specific outputs if needed.

#### Acceptance Criteria

1. WHEN a user triggers regeneration for a specific section, THE Analysis_Engine SHALL execute only that section's AI prompt against the stored transcript.
2. WHEN a section is regenerated, THE Analysis_Engine SHALL replace the previous result for that section in the persisted Analysis_Session.
3. WHILE a section is being regenerated, THE Stakeholder_Analysis_Page SHALL display a loading state for that section only, leaving other sections visible.

### Requirement 14: Export Capability

**User Story:** As a delivery manager, I want to export analysis results, so that I can share them with stakeholders who do not have access to the platform.

#### Acceptance Criteria

1. WHEN a user triggers export for a complete Analysis_Session, THE Export_Service SHALL generate a Markdown document containing all section results.
2. WHEN a user triggers copy-to-clipboard for a single section, THE Stakeholder_Analysis_Page SHALL copy the section content as formatted text to the system clipboard.
3. WHEN a user triggers export, THE Export_Service SHALL include the transcript file name, analysis date, and section headers in the exported document.

### Requirement 15: Navigation Integration

**User Story:** As a user of the Northline platform, I want to access the Stakeholder Analysis page from the sidebar navigation, so that it is discoverable alongside other platform features.

#### Acceptance Criteria

1. THE Stakeholder_Analysis_Page SHALL appear as a top-level item in the AppSidebar navigation component.
2. THE Stakeholder_Analysis_Page navigation item SHALL use an icon and label consistent with the Northline design system.
3. WHEN the user is on the `/stakeholders` route, THE AppSidebar SHALL highlight the Stakeholder Analysis navigation item as active.

### Requirement 16: Design System Compliance

**User Story:** As a user of the Northline platform, I want the Stakeholder Analysis page to be visually consistent with the rest of the application, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Stakeholder_Analysis_Page SHALL use Northline CSS custom properties (design tokens) for all colors, spacing, typography, and border radii.
2. THE Stakeholder_Analysis_Page SHALL use inline styles referencing CSS custom properties, consistent with the existing frontend pattern.
3. THE Stakeholder_Analysis_Page SHALL be responsive, rendering correctly on viewport widths from 768px to 1920px.
