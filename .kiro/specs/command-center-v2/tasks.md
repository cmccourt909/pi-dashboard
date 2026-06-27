# Implementation Plan: Command Center V2

## Overview

Redesign the Northline Delivery Intelligence overview page by replacing the left sidebar with a horizontal top navigation bar, adding a Lodestar AI briefing panel, a 5-card KPI strip, and a two-column layout (needs-attention + PI health) with a bottom section for recent findings and quick navigation. Implementation uses the existing Next.js 16 App Router, TypeScript, Vitest, and fast-check stack within the `dashboard/` directory.

## Tasks

- [x] 1. Set up component directory and shared utilities
  - [x] 1.1 Create the `dashboard/components/command-center/` directory structure and shared TypeScript interfaces
    - Create `dashboard/components/command-center/types.ts` with all shared interfaces: `KPIMetric`, `AttentionFinding`, `TeamHealth`, `NavCard`, `OverviewKPIs`, `DerivedTeamHealth`
    - Create `dashboard/components/command-center/utils.ts` with pure utility functions: `getDeltaColor`, `sortBySeverity`, `deriveTeamStatus`, `getHealthColor`
    - _Requirements: 4.7, 4.8, 5.2, 6.3_

  - [x] 1.2 Write property tests for shared utility functions
    - **Property 1: Delta color mapping** — test `getDeltaColor` returns teal for positive, coral for negative, neutral for zero with arbitrary integers
    - **Property 2: Findings severity sort order** — test `sortBySeverity` with arbitrary finding arrays ensures critical < warning < info ordering and stable within-group order
    - **Property 4: Team health color mapping** — test `getHealthColor` returns correct color for all status values; test `deriveTeamStatus` with arbitrary completion percentages and blocker booleans
    - Create test file `dashboard/components/command-center/command-center.property.test.ts`
    - **Validates: Requirements 4.7, 4.8, 5.2, 6.3, 6.5**

- [x] 2. Implement CommandCenterTopNav
  - [x] 2.1 Create `CommandCenterTopNav` component
    - Create `dashboard/components/command-center/CommandCenterTopNav.tsx`
    - Render fixed horizontal bar with deep-indigo (#202670) background and 56px height
    - Display Northline compass mark and "NORTHLINE DELIVERY INTELLIGENCE" text on the left
    - Render horizontal nav links: Overview, Features, Roadmap, Forecast, Findings, Admin
    - Highlight active nav link based on `currentPath` prop
    - Display user profile block (initials avatar + name) on the right
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_

  - [x] 2.2 Write unit tests for CommandCenterTopNav
    - Test all 6 nav links render with correct hrefs
    - Test active state highlights for current route
    - Test brand lockup (compass mark + title) is present
    - Test user profile block renders initials and name
    - Create test file `dashboard/components/command-center/CommandCenterTopNav.test.tsx`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Implement ProgramHeader
  - [x] 3.1 Create `ProgramHeader` component
    - Create `dashboard/components/command-center/ProgramHeader.tsx`
    - Display "Program overview" heading
    - Display last sync timestamp (formatted date/time)
    - Show visual loading indicator when `isSyncing` is true
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Implement KPI Strip
  - [x] 4.1 Create `KPICard` component
    - Create `dashboard/components/command-center/KPICard.tsx`
    - Render metric label, value, delta with color coding (teal/coral/neutral), and optional subtitle
    - Use `getDeltaColor` utility for delta coloring
    - Apply card styling with `--shadow-card` and `--radius-md`
    - _Requirements: 4.7, 4.8, 8.2_

  - [x] 4.2 Create `KPIStrip` component
    - Create `dashboard/components/command-center/KPIStrip.tsx`
    - Render horizontal row of 5 `KPICard` components
    - Map metrics array to cards with labels: Sprint velocity, Features on track, Active blockers, Days remaining, Forecast confidence
    - Apply responsive wrapping at 768px breakpoint
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.2_

  - [x] 4.3 Write unit tests for KPIStrip
    - Test 5 cards render with correct labels and values
    - Test delta color mapping renders correctly in DOM
    - Create test file `dashboard/components/command-center/KPIStrip.test.tsx`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5. Checkpoint - Verify shared utilities and top-level components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Lodestar Briefing Panel
  - [x] 6.1 Create `LodestarBriefing` client component
    - Create `dashboard/components/command-center/LodestarBriefing.tsx` with `"use client"` directive
    - Display version badge ("Lodestar AI" + version + "Portfolio briefing" label)
    - Display update timestamp
    - Render key headline and narrative paragraphs
    - Implement SSE streaming via EventSource to `/api/pis/{pi}/features/{key}/lodestar`
    - Render three action buttons: "Generate SteerCo briefing", "Refresh analysis", "Copy"
    - "Copy" button copies briefing text to clipboard via `navigator.clipboard.writeText`
    - "Refresh analysis" triggers a new SSE stream to reload narrative
    - Show loading state with skeleton placeholders while streaming
    - Handle SSE errors with inline error message and retry button
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 10.3_

  - [x] 6.2 Write unit tests for LodestarBriefing
    - Test version badge renders with correct text
    - Test copy button calls clipboard API
    - Test error state displays retry button
    - Test loading skeleton renders during fetch
    - Create test file `dashboard/components/command-center/LodestarBriefing.test.tsx`
    - _Requirements: 3.2, 3.6, 3.7, 3.8_

- [x] 7. Implement Needs Attention Section
  - [x] 7.1 Create `AttentionFindingCard` component
    - Create `dashboard/components/command-center/AttentionFindingCard.tsx`
    - Render severity badge (pill-shaped with `--radius-pill`), title, description
    - Render Lodestar AI recommendation text
    - Render "Address" and "Dismiss" action buttons
    - Apply visual emphasis for critical severity items
    - _Requirements: 5.3, 5.4, 5.5, 8.3_

  - [x] 7.2 Create `NeedsAttentionSection` component
    - Create `dashboard/components/command-center/NeedsAttentionSection.tsx`
    - Sort findings by severity using `sortBySeverity` utility
    - Map findings to `AttentionFindingCard` components
    - Display empty state message "All clear — no items need attention" when no findings
    - Wire `onDismiss` and `onAddress` callbacks to action buttons
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 7.3 Write property test for finding rendering completeness
    - **Property 3: Finding rendering completeness** — render `AttentionFindingCard` with generated findings and verify all fields (severity, title, description, recommendation) and action buttons are present
    - Add to `dashboard/components/command-center/command-center.property.test.ts`
    - **Validates: Requirements 5.3, 5.4, 5.5**

  - [x] 7.4 Write unit tests for NeedsAttentionSection
    - Test findings render in severity order
    - Test empty state message displays when no findings
    - Test action buttons trigger callbacks
    - Create test file `dashboard/components/command-center/NeedsAttentionSection.test.tsx`
    - _Requirements: 5.2, 5.5, 5.6_

- [x] 8. Implement PI Health Section
  - [x] 8.1 Create `TeamHealthRow` component
    - Create `dashboard/components/command-center/TeamHealthRow.tsx`
    - Render team name, status indicator with color (teal/amber/coral via `getHealthColor`)
    - Apply visual emphasis styling for critical status teams
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 8.2 Create `PIHealthSection` component
    - Create `dashboard/components/command-center/PIHealthSection.tsx`
    - Render overall PI progress bar with `aria-valuenow` and proportional fill width
    - Render list of `TeamHealthRow` components
    - Display empty state when no PI data available
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.3 Write property test for progress bar accuracy
    - **Property 5: Progress bar value accuracy** — render progress bar with arbitrary percentages (0–100) and verify `aria-valuenow` matches clamped value and fill width is proportional
    - Add to `dashboard/components/command-center/command-center.property.test.ts`
    - **Validates: Requirements 6.2**

  - [x] 8.4 Write unit tests for PIHealthSection
    - Test progress bar renders correct percentage
    - Test team rows render with correct status colors
    - Test critical teams have visual emphasis
    - Create test file `dashboard/components/command-center/PIHealthSection.test.tsx`
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 9. Checkpoint - Verify all section components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Bottom Section
  - [x] 10.1 Create `RecentFindingsList` component
    - Create `dashboard/components/command-center/RecentFindingsList.tsx`
    - Render list of recent findings with severity badges and titles
    - Display empty state when no findings
    - _Requirements: 7.2_

  - [x] 10.2 Create `QuickNavigationGrid` component
    - Create `dashboard/components/command-center/QuickNavigationGrid.tsx`
    - Render 4 navigation cards: Roadmap, Forecast, Features, Findings
    - Each card includes label, description, icon, and link
    - Cards navigate to corresponding pages on click
    - _Requirements: 7.4, 7.5_

  - [x] 10.3 Write property test for recent findings badge rendering
    - **Property 6: Recent findings badge rendering** — render `RecentFindingsList` with generated finding data and verify severity badge text and title are present for each item
    - Add to `dashboard/components/command-center/command-center.property.test.ts`
    - **Validates: Requirements 7.2**

  - [x] 10.4 Write unit tests for QuickNavigationGrid
    - Test 4 cards render with correct labels and hrefs
    - Test cards are navigable links
    - _Requirements: 7.4, 7.5_

- [x] 11. Implement CommandCenterFooter
  - [x] 11.1 Create `CommandCenterFooter` component
    - Create `dashboard/components/command-center/CommandCenterFooter.tsx`
    - Render "Powered by Lodestar AI" text and compass mark icon
    - _Requirements: 8.5_

- [x] 12. Wire overview page with layout and data integration
  - [x] 12.1 Create KPI derivation logic in server-side data layer
    - Create `dashboard/components/command-center/derive-kpis.ts`
    - Implement `deriveOverviewKPIs` function that computes sprint velocity, features on track, active blockers, days remaining, and forecast confidence from PI and findings API data
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 10.1, 10.2_

  - [x] 12.2 Update `app/layout.tsx` to conditionally render CommandCenterTopNav
    - Conditionally render `CommandCenterTopNav` on the overview route (`/`) instead of `AppSidebar`
    - Ensure `AppSidebar` is NOT rendered on the overview page
    - _Requirements: 1.6, 1.7_

  - [x] 12.3 Rebuild `app/page.tsx` as the Command Center V2 overview page
    - Fetch PI data from `/api/pis` and findings data from `/api/findings` as Server Component
    - Derive KPIs using `deriveOverviewKPIs`
    - Compose full page layout: ProgramHeader → LodestarBriefing → KPIStrip → two-column (NeedsAttentionSection + PIHealthSection) → bottom section (RecentFindingsList + QuickNavigationGrid + executive briefing CTA) → CommandCenterFooter
    - Implement loading skeleton placeholders while data fetches
    - Implement non-blocking error banner for API failures
    - Apply responsive two-column layout that stacks below 1024px
    - Apply full-width main content area with appropriate padding and top margin (56px for nav bar)
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 7.3, 8.1, 9.1, 10.1, 10.2, 10.4, 10.5_

- [x] 13. Implement responsive styles
  - [x] 13.1 Add responsive CSS/Tailwind classes for all breakpoints
    - Apply single-column stacking for two-column sections below 1024px
    - Apply KPI card wrapping into multi-row grid below 768px
    - Implement mobile menu or bottom navigation for TopNav below 768px
    - Ensure all design tokens (shadows, radii, colors) use CSS custom properties
    - _Requirements: 9.1, 9.2, 9.3, 8.1, 8.2, 8.3, 8.4_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript within the existing Next.js 16 + Vitest + fast-check stack
- All components reside in `dashboard/components/command-center/` directory
- Pure utility functions are tested with property-based tests for broad input coverage

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "12.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3"] },
    { "id": 4, "tasks": ["6.1", "7.1", "8.1", "10.1", "10.2", "11.1"] },
    { "id": 5, "tasks": ["6.2", "7.2", "8.2", "10.3", "10.4"] },
    { "id": 6, "tasks": ["7.3", "7.4", "8.3", "8.4"] },
    { "id": 7, "tasks": ["12.2", "12.3"] },
    { "id": 8, "tasks": ["13.1"] }
  ]
}
```
