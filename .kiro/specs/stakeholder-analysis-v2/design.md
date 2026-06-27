# Design: Stakeholder Analysis V2 — UI Enhancement

## Overview

This design enhances the existing Stakeholder Analysis frontend to match the Northline mockup. The backend is already complete — this is purely a frontend redesign of the page layout, component architecture, and data visualizations.

## Architecture

### Component Hierarchy

```
StakeholderAnalysisPage (page.tsx)
├── TranscriptDock          ← Enhanced upload with drag-drop, options
├── LodestarStrip           ← AI insights summary banner
├── KPISummary              ← Row of 5 metric cards
├── Section layout (flex row on desktop)
│   ├── SectionRail         ← Left nav with 8 sections + status dots
│   └── Active Section View (one of):
│       ├── SpeakerStatsView     ← Voice bar + speaker grid + warning
│       ├── MeetingMinutesView   ← Decisions/Commitments tables + questions
│       ├── RaidLogView          ← Tabbed R/A/I/D tables
│       ├── DeliverySignalsView  ← P1/P2/P3 columns
│       ├── TeamHealthView       ← SVG gauge + sub-dimension bars + Lodestar note
│       ├── GapAnalysisView      ← Absent roles chips + topics + questions
│       ├── EmpathyMapView       ← Stakeholder switcher + 6-quadrant grid
│       └── StakeRegisterView    ← Table + SVG influence map
└── MobileBottomNav         ← Mobile-only bottom tab bar
```

### Data Flow

The enhanced views consume the same `useAnalysisStream` hook already built. Each section view receives its `SectionState` (status + text) and parses the markdown text into structured data for visualization. No backend changes needed.

### Parsing Strategy

Each enhanced section view includes a client-side parser that extracts structured data from the markdown output:

- **SpeakerStatsView**: Regex to extract speaker table rows → `{name, role, pct, utterances, words}`
- **MeetingMinutesView**: Split by ## headers → decisions table, commitments table, questions list
- **RaidLogView**: Split by ## R/A/I/D headers → items with severity/probability/owner
- **DeliverySignalsView**: Split by ## P1/P2/P3 → action items per tier
- **TeamHealthView**: Regex for "Score: X/10" and sub-scores → gauge value + bar values
- **GapAnalysisView**: Regex for bullet lists under headers → chips arrays
- **EmpathyMapView**: Split by stakeholder headers → quadrant arrays
- **StakeRegisterView**: Table parsing → register rows + SVG coordinates

## Component Specifications

### 1. TranscriptDock

**Layout**: Card with header (title + options row) and dashed drop zone.

**Options row** (hidden on mobile):
- Speaker attribution: `<select>` with options auto/manual/none
- Language: `<select>` with EN/ES
- Anonymize PII: `<input type="checkbox">` (default checked)

**Drop zone**: 
- Dashed 2px border, rounded-lg
- Upload icon (indigo fill-indigo background)
- Text: "Drag & drop a .vtt, .srt, .txt or .docx — or browse"
- Sub-text: "Max 25 MB · 90 minutes recommended"
- Right side: file pill (if selected) + "Upload & Analyze" button + "Use sample transcript" button

**Interactions**:
- `onDragOver` / `onDrop` handlers for file drop
- File input triggered by clicking the drop zone or "browse" text
- Upload button triggers POST to `/api/stakeholders/upload`

### 2. LodestarStrip

**Layout**: Card with blue left border (3px), fill-info background, Lodestar icon, bullet list, "View findings" link.

**Data source**: Generated post-analysis by summarizing key findings. For MVP, extract from:
- Speaker stats: highest voice concentration warning
- RAID: count of high-severity items
- Gap analysis: count of absent roles

### 3. KPISummary

**Layout**: Flexbox row of 5 cards, wrap on mobile.

Each card:
- Label (uppercase, slate, 12px)
- Value (28px bold, colored)
- Optional sub-text (11px, slate)

**Values extracted from**:
- Stakeholders identified: count from stakeholder register
- Tier 1 key players: count where tier=1
- Critical risks: count where severity=High in RAID risks
- At-risk dependencies: count where status contains "risk" or "delay"
- Team Health: score parsed from team health section

### 4. SectionRail

**Layout**: 220px wide card, sticky top-20, list of buttons.

Each item: icon (16px) + label (13px) + status dot (8px circle, right-aligned).

**Status mapping**:
- `complete` → teal dot
- `streaming` → sky/blue dot (animated pulse)
- `error` → coral dot
- `pending` → slate dot

Active item: fill-indigo background, indigo text, font-weight 600.

### 5. SpeakerStatsView

**Components**:
- **VoiceBar**: `<div>` with `height: 12px`, `border-radius: full`, children are colored segments with `width: {pct}%`
- **SpeakerGrid**: 2-column grid of speaker cards (avatar circle + name + role + percentage)
- **ConcentrationWarning**: fill-warning alert if top speaker > 60%

**Parser**: Extracts from markdown table `| Speaker | Utterances | Words | Share of Voice |`

### 6. MeetingMinutesView

**Components**:
- 2-column grid (Decisions table left, Commitments table right)
- Open Questions list below

**Table style**: Border rounded-md, header row with stone background, pill badges for Owner and Due Date.

### 7. RaidLogView

**Components**:
- Tab strip (stone background, white active tab with shadow)
- Content table (grid columns: Item, Severity pill, Probability, Owner pill)

**Tabs**: R/A/I/D, default "R"

### 8. DeliverySignalsView

**Components**:
- 3-column grid with colored header per column
- Each column: header bar (P1 Now coral, P2 Next amber, P3 Later neutral) + item list or empty state

**Empty state**: Icon (msgOff) + "No actions detected" text

### 9. TeamHealthView

**Components**:
- **HealthGauge** (SVG): 120×120, ring chart with partial fill
- **SubBars**: 4 horizontal progress bars (voice, facilitation, blockers, agile)
- **LodestarNote**: fill-info card with left border + recommendation text

**Gauge colors**: coral (<50%), amber (50-70%), teal (>70%)

### 10. GapAnalysisView

**Components**:
- 2-column grid: "Roles absent" (coral chips) + "Topics not discussed" (slate chips)
- "Suggested questions" card below (fill-info background, numbered list with copy buttons)

### 11. EmpathyMapView

**Components**:
- Stakeholder buttons row (pills, active = indigo filled)
- 2×2 grid: Says, Thinks, Does, Feels (each bordered card with colored label)
- 2-column row: Pains (fill-danger bg) + Gains (fill-success bg)

### 12. StakeRegisterView

**Components**:
- Register table (5 columns with avatar, tier pill, power, interest, engagement pill)
- **InfluenceSVG**: 400×320 viewBox, stone background rect, dashed midlines, quadrant labels, positioned circles with name labels

**Circle colors by tier**: Tier 1 indigo, Tier 2 sky, Tier 3 amber, Tier 4 slate

## Styling Guidelines

All components use inline styles with Northline tokens. No Tailwind in production — the mockup uses Tailwind for prototyping only. Production code uses CSS custom properties via `style={{}}` matching the existing `dashboard/app/globals.css` tokens.

## File Structure

```
dashboard/components/stakeholders/
├── TranscriptDock.tsx
├── LodestarStrip.tsx
├── KPISummary.tsx
├── SectionRail.tsx
├── views/
│   ├── SpeakerStatsView.tsx
│   ├── MeetingMinutesView.tsx
│   ├── RaidLogView.tsx
│   ├── DeliverySignalsView.tsx
│   ├── TeamHealthView.tsx
│   ├── GapAnalysisView.tsx
│   ├── EmpathyMapView.tsx
│   └── StakeRegisterView.tsx
├── visualizations/
│   ├── VoiceBar.tsx
│   ├── HealthGauge.tsx
│   └── InfluenceSVG.tsx
├── parsers.ts            ← Section text → structured data parsers
├── MobileBottomNav.tsx
├── useAnalysisStream.ts  ← (existing, no changes)
└── index.ts
```
