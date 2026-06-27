# Implementation Plan: Stakeholder Analysis V2 — UI Enhancement

## Overview

This plan upgrades the existing Stakeholder Analysis frontend to match the Northline design mockup. The backend is complete — all tasks are frontend-only. Work is organized into waves: parsers first (shared utility), then layout shell, then individual section views, then polish.

## Tasks

- [x] 1. Section text parsers
  - [x] 1.1 Implement `parsers.ts` with structured extraction functions
    - `parseSpeakerStats(text) → { speakers: [{name, role, pct, utterances, words}], concentrationRatio, silentParticipants }`
    - `parseMeetingMinutes(text) → { decisions: [], commitments: [], openQuestions: [] }`
    - `parseRaidLog(text) → { risks: [], assumptions: [], issues: [], dependencies: [] }`
    - `parseDeliverySignals(text) → { p1: [], p2: [], p3: [] }`
    - `parseTeamHealth(text) → { overallScore, voiceConcentration, facilitation, blockerSurfacing, agileMaturity, recommendation }`
    - `parseGapAnalysis(text) → { absentRoles: [], undiscussedTopics: [], suggestedQuestions: [] }`
    - `parseEmpathyMap(text) → { stakeholders: [{name, thinks, feels, says, does, pains, gains}] }`
    - `parseStakeholderRegister(text) → { stakeholders: [{name, tier, power, interest, strategy}] }`
    - _Requirements: All section views depend on this_

  - [ ] 1.2 Write unit tests for each parser
    - Test with sample markdown output matching each section's prompt format
    - Test edge cases: empty text, partial output, missing headers
    - _Requirements: Validates parser correctness_

- [x] 2. Page layout and shell components
  - [x] 2.1 Implement `SectionRail` component
    - 220px wide sticky sidebar with 8 section items
    - Each item: icon + label + status dot
    - Active item highlighted with indigo fill
    - Collapses to horizontal scroll on mobile (<1024px)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 2.2 Implement `MobileBottomNav` component
    - Fixed bottom bar, visible only below 768px
    - 5 icon tabs: Overview, Features, Roadmap, Stakeholders, Findings
    - Active tab (Stakeholders) highlighted in indigo
    - _Requirements: 13.1, 13.2_

  - [x] 2.3 Rewrite `page.tsx` with new layout structure
    - TranscriptDock → LodestarStrip → KPISummary → SectionRail + ActiveView
    - Section views switch based on SectionRail selection
    - Wire existing `useAnalysisStream` hook
    - _Requirements: 4.3, 13.3, 13.4, 13.5_

- [x] 3. TranscriptDock
  - [x] 3.1 Implement enhanced `TranscriptDock` component
    - Drag-and-drop support (onDragOver, onDragEnter, onDragLeave, onDrop)
    - Dashed border drop zone with upload icon
    - File type display (.vtt, .srt, .txt, .docx)
    - Options row: speaker attribution dropdown, language dropdown, PII checkbox
    - File pill (name + size + duration) once selected
    - "Upload & Analyze" and "Use sample transcript" buttons
    - Replaces existing `TranscriptUploader` component
    - _Requirements: 1.1–1.9_

- [x] 4. KPI Summary and Lodestar Strip
  - [x] 4.1 Implement `KPISummary` component
    - Row of 5 metric cards derived from parsed section data
    - Cards: stakeholders count, tier-1 count, critical risks, at-risk deps, team health
    - Color-coded values with accent colors
    - Hidden until first section completes
    - _Requirements: 3.1–3.4_

  - [x] 4.2 Implement `LodestarStrip` component
    - Blue left-border info card with Lodestar icon
    - Up to 3 bullet insights derived from completed sections
    - "View findings" link
    - Hidden until analysis completes
    - _Requirements: 2.1–2.4_

- [x] 5. Section views — Speaker Statistics & Meeting Minutes
  - [x] 5.1 Implement `SpeakerStatsView`
    - VoiceBar (horizontal stacked bar, colored segments)
    - Speaker grid (2-col, avatar + name + role + pct)
    - Concentration warning alert (if top speaker > 60%)
    - Uses `parseSpeakerStats()` on section text
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.2 Implement `MeetingMinutesView`
    - 2-column grid: Decisions table (left) + Commitments table (right)
    - Open Questions list below with speaker pills and "Jump to transcript" link
    - Table headers with stone background
    - Pill badges for Owner and Due Date
    - Uses `parseMeetingMinutes()` on section text
    - _Requirements: 6.1–6.4_

- [x] 6. Section views — RAID Log & Delivery Signals
  - [x] 6.1 Implement `RaidLogView`
    - Tab strip (Risks, Assumptions, Issues, Dependencies)
    - Active tab: white bg with shadow; inactive: stone bg
    - Content table per tab with severity pills (color-coded)
    - Uses `parseRaidLog()` on section text
    - _Requirements: 7.1–7.4_

  - [x] 6.2 Implement `DeliverySignalsView`
    - 3-column grid with colored headers (P1 coral, P2 amber, P3 neutral)
    - Action item cards per column
    - Empty state with icon + message
    - Lodestar info note if no P1 actions found
    - Uses `parseDeliverySignals()` on section text
    - _Requirements: 8.1–8.3_

- [x] 7. Section views — Team Health & Gap Analysis
  - [x] 7.1 Implement `TeamHealthView` with `HealthGauge` SVG
    - Circular gauge (120×120 SVG, ring with partial fill)
    - 4 horizontal progress bars for sub-dimensions
    - Lodestar recommendation card below
    - Color thresholds: <5 coral, 5-7 amber, >7 teal
    - Uses `parseTeamHealth()` on section text
    - _Requirements: 9.1–9.4_

  - [x] 7.2 Implement `GapAnalysisView`
    - 2-column grid: Absent Roles (coral chips) + Undiscussed Topics (slate chips)
    - Suggested Questions card (fill-info bg, numbered list, copy buttons per question)
    - Uses `parseGapAnalysis()` on section text
    - _Requirements: 10.1, 10.2, 10.3 (from mockup)_

- [x] 8. Section views — Empathy Map & Stakeholder Register
  - [x] 8.1 Implement `EmpathyMapView`
    - Stakeholder switcher (pill buttons row)
    - 2×2 grid: Says/Thinks/Does/Feels (bordered cards, colored labels)
    - Pains (fill-danger) and Gains (fill-success) row below
    - Uses `parseEmpathyMap()` on section text
    - _Requirements: 10.1–10.4_

  - [x] 8.2 Implement `StakeRegisterView` with `InfluenceSVG`
    - Register table (5 columns with avatar initials, tier pill, values, strategy pill)
    - SVG influence map (400×320) with quadrant labels, dashed lines, positioned circles
    - Circles colored by tier, positioned by power/interest coordinates
    - Name labels beside each circle
    - Uses `parseStakeholderRegister()` on section text
    - _Requirements: 11.1–11.5_

- [x] 9. Section shell and actions
  - [x] 9.1 Implement `SectionShell` wrapper component
    - Card with title (h2) + action buttons (Copy, Regenerate) in header
    - Copy button: clipboard icon, copies section text
    - Regenerate button: refresh icon, triggers single-section regeneration
    - Wraps all section views
    - _Requirements: 12.1–12.3_

- [ ] 10. Responsive polish
  - [ ] 10.1 Implement responsive breakpoints
    - Tables horizontally scrollable on narrow viewports
    - 2-column grids → single column below 640px
    - Section rail → horizontal scroll below 1024px
    - Options row in TranscriptDock hidden on mobile
    - _Requirements: 13.3–13.5_

  - [ ] 10.2 Wire MobileBottomNav to page
    - Show only below 768px (md breakpoint)
    - Hide desktop sidebar on mobile
    - _Requirements: 13.1, 13.2_

- [x] 11. Integration and testing
  - [x] 11.1 Update `page.tsx` to wire all new components
    - Replace current inline section panels with new section views
    - Integrate parsers with useAnalysisStream state
    - Integrate KPISummary and LodestarStrip data extraction
    - _Requirements: All_

  - [ ] 11.2 Write component tests for new section views
    - Test each view renders correctly with parsed data
    - Test SectionRail click navigation
    - Test tab switching in RaidLogView
    - Test stakeholder switcher in EmpathyMapView
    - Test gauge renders correct score
    - _Requirements: All_

  - [ ] 11.3 Visual regression check
    - Compare rendered output against HTML mockup
    - Verify color tokens, spacing, and typography match
    - Verify responsive behavior at 768px, 1024px, 1920px
    - _Requirements: 14.1–14.5_

## Notes

- No backend changes needed — all data comes from existing `useAnalysisStream` hook
- The enhanced parsers extract structured data from LLM markdown output (same content, richer display)
- The "Use sample transcript" feature needs a static sample file added to `public/` or hardcoded
- File format expansion (.vtt, .srt, .docx) requires a backend change to accept those MIME types — create a separate backend ticket if pursuing
- For MVP, the new formats can be displayed in the UI but the backend still only processes .txt — other formats show a "coming soon" indicator

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["2.3", "4.1", "4.2", "9.1"] },
    { "id": 3, "tasks": ["5.1", "5.2", "6.1", "6.2"] },
    { "id": 4, "tasks": ["7.1", "7.2", "8.1", "8.2"] },
    { "id": 5, "tasks": ["10.1", "10.2", "11.1"] },
    { "id": 6, "tasks": ["11.2", "11.3"] }
  ]
}
```
