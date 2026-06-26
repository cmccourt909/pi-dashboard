# Northline Rebrand — Implementation Plan

**Source:** `Northline_Branding_Spec_v1.1.md`  
**Status:** Draft

## Overview

Replace WaypointPI branding with Northline across the product. The plan proceeds in waves: tokens first, then navigation, then component updates, then new components, then responsive polish and cleanup.

## Tasks

### Wave 0 — Foundation & Decisions

- [ ] **0.1 Resolve open decisions** — Product/Design sign-off required
  - Dark mode scope (Section 3.5)
  - GlobalSearch scope and API endpoint
  - NotificationBell event types and read/unread model
  - LodestarBriefingPanel output format
  - RecentActivityFeed data source
  - RoadmapTableView column schema
  - AskLodestar interaction model

- [ ] **0.2 Deliver design assets**
  - Northline logo SVG set (Primary, Compact, Icon, Mono)
  - Lodestar AI mark SVG
  - Figma component library with all tokens
  - Responsive specs for all breakpoints

- [ ] **0.3 Audit existing codebase**
  - Identify all hardcoded color values in `dashboard/`
  - Confirm active imports of `GanttBar.tsx` vs `gantt-bar.tsx`
  - Audit `app/roadmap/types.ts` vs `types/roadmap.ts`
  - List all components affected by H1 resize

### Wave 1 — Design Tokens

- [x] **1.1 Replace color tokens in `globals.css`**
  - Replace current palette with Northline brand + semantic tokens
  - Add status fills, navigation, surface, text, border tokens

- [x] **1.2 Add typography tokens**
  - Inter font family, type scale, weights, line heights

- [x] **1.3 Add spacing, radius, and shadow tokens**

- [x] **1.4 Load Inter via next/font in `layout.tsx`**
  - Set CSS variable `--font-family-base` from `next/font/google`

- [x] **1.5 Update page metadata to Northline**
  - Title and description reflect Northline brand

- [ ] **1.6 Audit and update Tailwind config**
  - `@theme` block already in `globals.css`; verify Tailwind v4 picks up tokens
  - Ensure no hardcoded hex values remain in component files

- [ ] **1.7 Unit tests / lint rule for token usage**
  - Add a CI check or manual checklist to flag hardcoded colors

### Wave 2 — Navigation

- [x] **2.1 Build `AppSidebar` component**
  - 176px expanded / 64px collapsed
  - Deep Indigo background, active pill state, hover state
  - Logo lockup (compact variant)
  - Navigation items with Tabler icons
  - Bottom `UserProfileBlock`

- [x] **2.2 Build `TopNavBar` component**
  - 56px height, white background, shadow
  - Page title derived from current route, live indicator, refresh, search, bell, avatar

- [x] **2.3 Build navigation sub-components**
  - `UserProfileBlock`
  - `LiveDataIndicator` (desktop pill + mobile compact)

- [x] **2.4 Decommission `NavLinks.tsx`**
  - Removed from layout
  - Wired AppSidebar + TopNavBar into root layout
  - Main content offset by sidebar width (176px) and top nav height (56px)

- [x] **2.5 Build placeholder / scope components**
  - `NotificationBell` (placeholder with badge cap at 99+)
  - `GlobalSearch` (placeholder with ⌘K trigger and expanded input)

- [x] **2.6 Implement mobile bottom navigation**
  - 5 tabs, active/inactive states
  - Hidden on desktop, shown on ≤767px

- [x] **2.7 Navigation tests**
  - Render tests for sidebar, top bar, user profile, live indicator, notification bell, global search, mobile bottom nav
  - Active route state tests
  - Accessibility tests (focus, ARIA labels)

### Wave 3 — Existing Component Updates

- [x] **3.1 Update roadmap components to tokens**
  - `SummaryStrip` — semantic tokens, type scale
  - `GanttBar` — Teal done, Amber in-progress, Slate todo
  - `GanttHeader` — tokens, surface/fill colors
  - `FilterBar` — Indigo active pill, transparent inactive
  - `TeamGroup` — tokens
  - `FeatureRow` — hover state
  - `TodayLine` — Coral
  - `SprintMiniGrid` — Northline palette for team colors
  - `BlockerFlag` — Coral focus ring

- [x] **3.2 Update shared components**
  - `HealthBadge` — semantic tokens
  - `PICard` — tokens + H1/H2 review
  - `ProgressBar` — semantic tokens
  - `ErrorBoundary` — tokens

- [x] **3.3 Update `DetailDrawer`**
  - Northline shadow, surface, tokens, RAG badge semantic colors

- [x] **3.4 Update `LodestarPanel`**
  - Section border colors (Teal, Amber, Sky Blue), text colors
  - Retain four states (Idle, Streaming, Complete, Error)
  - Streaming and structured rendering still work

- [x] **3.5 Component update tests**
  - Updated existing tests with new token/color expectations
  - Added navigation tests for Wave 2 components

### Wave 4 — New Components

- [x] **4.1 Build `AskLodestar` button**
  - Outlined Indigo button, `ti-sparkles` icon
  - Placeholder on-click behavior until chat scope defined
  - Used in Overview and Roadmap pages

- [x] **4.2 Build `NorthlineInsightsStrip`**
  - 3 AI bullet points on Overview
  - Static narrative, refreshed on load/manual refresh
  - "View findings →" link

- [x] **4.3 Build `LodestarBriefingPanel`**
  - Executive briefing CTA panel
  - Indigo "Generate Briefing" primary button
  - Placeholder generation action

- [x] **4.4 Build `RecentActivityFeed`**
  - Timestamped entries
  - Color-coded by type: sync = Teal, AI = Sky Blue, finding = Coral
  - Prop-driven (default entries) until data source defined

- [x] **4.5 Build `TopFindings`** (mobile only)
  - Critical-first filtered list
  - "All N ↓" filter dropdown
  - Hidden on desktop via `.mobile-only` utility

- [x] **4.6 Build `RoadmapTableView`**
  - Timeline/Table toggle
  - Wrapped existing Gantt as timeline view
  - Table view placeholder until schema defined

- [x] **4.7 New component tests**
  - Render and prop tests for all Wave 4 components
  - Placeholder interaction tests

### Wave 5 — Responsive & Layout

- [x] **5.1 Implement breakpoints and layout shell**
  - Moved main-content base styles to `globals.css` so media queries override
  - Sidebar hidden on mobile, main content full-width

- [x] **5.2 Responsive KPI strip**
  - 5 columns desktop, 3 columns tablet, 2 columns mobile (3+2 wrap)

- [x] **5.3 Responsive DetailDrawer**
  - 480px desktop, 360px tablet, 100% mobile

- [x] **5.4 Responsive Gantt**
  - Wrapped existing Gantt in `RoadmapTableView` toggle
  - Horizontal scroll preserved; full mobile Gantt polish deferred

- [x] **5.5 Touch target audit**
  - 44×44px minimum applied to nav links, TopNavBar buttons/avatar, mobile tabs, FilterBar pills, FeatureRow, BlockerFlag, TeamGroup header, AskLodestar, briefing button, table-view toggles, findings filter

- [x] **5.6 Responsive tests**
  - Added touch target tests for all audited components
  - Updated DetailDrawer test for new responsive class

### Wave 6 — Cleanup & Verification

- [x] **6.1 Delete legacy files**
  - `app/roadmap/gantt-bar.tsx` — deleted
  - `app/roadmap/styles.ts` — deleted
  - `app/roadmap/types.ts` — deleted

- [x] **6.2 Remove `NavLinks.tsx`**
  - Deleted

- [x] **6.3 Run full frontend test suite**
  - All tests passed

- [x] **6.4 Run frontend build**
  - Build succeeded

- [x] **6.5 Manual smoke test**
  - Verified build output and route list

- [x] **6.6 Code review checklist**
  - No hardcoded hex values across `.tsx/.ts/.css`
  - Removed legacy aliases from `globals.css`
  - Migrated legacy tokens (`--color-danger`, `--color-warning`, `--color-success`, `--color-indigo-*`, `--color-text-muted`, etc.) to Northline tokens
  - Inter is the only brand font (monospace reserved for data/code)
  - Type scale tokens applied in cleaned pages

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0.1", "0.2", "0.3"] },
    { "id": 1, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6"] }
  ]
}
```

## Notes

- Tasks marked with `[ ]` should be checked off as completed.
- Open decisions in Wave 0 block specific components in Waves 2 and 4.
- The spec totals 13 new components, 15 updates, 1 decommission, and 3 delete/migrate actions.
