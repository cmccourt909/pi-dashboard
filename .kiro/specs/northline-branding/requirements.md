# Northline Rebrand — Requirements

**Source:** `Northline_Branding_Spec_v1.1.md`  
**Status:** Draft for review  
**Scope:** Replace WaypointPI branding with Northline across the product UI, including new navigation, design token system, component updates, and new overview/roadmap components.

## 1. Brand Identity

### 1.1 Name & Lockup
- **R1.1** The product must display the name **Northline** (sentence case in UI, all-caps only in the logo wordmark).
- **R1.2** Full product name "Northline Delivery Intelligence" is used in formal contexts only.
- **R1.3** The AI sub-brand **Lodestar AI** is retained without renaming.
- **R1.4** Logo lockup must show the compass mark + "NORTHLINE" wordmark + "DELIVERY INTELLIGENCE" descriptor + "Powered by Lodestar AI" sub-line.

### 1.2 Voice & Tone
- **R1.5** In-product copy is direct, specific, active, measured, and jargon-light.
- **R1.6** Lodestar AI-generated content is limited to three paragraphs, leading with status, then risk, then action.

## 2. Color System

### 2.1 Brand Palette
- **R2.1** The application must use the Northline brand palette:
  - Deep Indigo `#202670` — sidebar background, logo mark
  - Indigo `#4C4088` — primary interactive, active states, CTAs, links
  - Sky Blue `#1D6EFF` — secondary interactive, AI layer accents
  - Teal `#0F6038` — success / complete
  - Amber `#F5A623` — warning / at risk
  - Coral `#E85D46` — critical / danger
  - Slate `#847488` — secondary text
  - Stone `#F2F4F6` — page background
  - White `#FFFFFF` — card surfaces
  - Ink `#0E0E1A` — body text

### 2.2 Semantic Color Rules
- **R2.2** Indigo must not be used for danger or warning states.
- **R2.3** Coral must be used only for critical status and danger states.
- **R2.4** Amber must be used only for at-risk and warning states.
- **R2.5** All hardcoded hex values must be replaced by CSS custom properties defined in `globals.css`.

## 3. Typography

### 3.1 Typeface
- **R3.1** The product must use **Inter** exclusively for all UI text.
- **R3.2** No font size below 12px may render in production UI.

### 3.2 Type Scale
- **R3.3** H1 is increased from 20px to 32px; H2 is 20px; H3 is 16px; Body is 14px; Label/Caption is 12px.
- **R3.4** All layout components containing headings must be reviewed for the H1 scale change.

## 4. Navigation

### 4.1 AppSidebar
- **R4.1** A persistent left sidebar must replace the existing `NavLinks.tsx` component.
- **R4.2** Expanded sidebar width is 176px; collapsed width is 64px.
- **R4.3** Sidebar background is Deep Indigo.
- **R4.4** Active nav item is an Indigo rounded pill inset 8px from sidebar edges.
- **R4.5** Inactive nav items use white text and icon at 65% opacity.
- **R4.6** A `UserProfileBlock` must be pinned to the bottom of the sidebar.

### 4.2 TopNavBar
- **R4.7** A 56px top utility bar must appear above the content area.
- **R4.8** TopNavBar must include page title, live data indicator, refresh button, search, notification bell, and user avatar.

### 4.3 Mobile Navigation
- **R4.9** At ≤767px the sidebar must collapse to a bottom navigation bar with 5 tabs.
- **R4.10** Mobile TopNavBar must retain the NORTHLINE wordmark and use a compact "Live" indicator.

## 5. Components

### 5.1 New Components
- **R5.1** Build `AppSidebar`, `TopNavBar`, `LiveDataIndicator`, `GlobalSearch`, `NotificationBell`, `UserProfileBlock`.
- **R5.2** Build overview components: `NorthlineInsightsStrip`, `LodestarBriefingPanel`, `RecentActivityFeed`, `TopFindings`.
- **R5.3** Build `AskLodestar` persistent CTA button.

### 5.2 Updated Components
- **R5.4** Update all roadmap components to Northline color tokens: `SummaryStrip`, `GanttBar`, `GanttHeader`, `FilterBar`, `TeamGroup`, `FeatureRow`, `DetailDrawer`, `LodestarPanel`, `BlockerFlag`, `TodayLine`, `SprintMiniGrid`.
- **R5.5** Update shared components: `HealthBadge`, `PICard`, `ProgressBar`.

### 5.3 Legacy Cleanup
- **R5.6** Delete `app/roadmap/gantt-bar.tsx` after confirming `GanttBar.tsx` is the active import.
- **R5.7** Migrate `app/roadmap/styles.ts` to Tailwind or CSS tokens and delete it.
- **R5.8** Consolidate `app/roadmap/types.ts` into `types/roadmap.ts` and delete the local file.

## 6. Responsive Design

### 6.1 Breakpoints
- **R6.1** The application must support four breakpoints: Desktop (≥1280px), Tablet (768–1279px), Mobile Large (414–767px), Mobile (≤413px).
- **R6.2** KPI strip must use 5 columns on desktop, 3 columns on tablet, and 3+2 grid on mobile.
- **R6.3** DetailDrawer must be 480px on desktop, 360px on tablet, and full-screen on mobile.
- **R6.4** Touch targets must be at least 44×44px on all interactive elements.

## 7. Lodestar AI

### 7.1 AI Colour Rule
- **R7.1** Lodestar AI content must use Sky Blue (`#1D6EFF`) to distinguish AI-generated content from Northline product chrome.

### 7.2 Lodestar Panel States
- **R7.2** The existing LodestarPanel four-state system (Idle, Streaming, Complete, Error) is retained.

## 8. Open Decisions

The following decisions are marked `[OPEN]` in the source spec and block implementation until resolved:
- **O1** Dark mode support (Section 3.5)
- **O2** GlobalSearch scope and API endpoint
- **O3** NotificationBell event types and read/unread state
- **O4** LodestarBriefingPanel output format
- **O5** RecentActivityFeed data source
- **O6** RoadmapTableView column schema
- **O7** AskLodestar interaction model

## 9. Non-Goals

- **NG1** Trademark filing and legal clearance are tracked separately.
- **NG2** Dark mode is not in scope for the initial Northline release unless Open Decision O1 is resolved.
- **NG3** No changes to the Lodestar AI name or mark.
