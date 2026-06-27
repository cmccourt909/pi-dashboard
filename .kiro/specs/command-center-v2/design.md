# Design Document: Command Center V2

## Overview

Command Center V2 is a full redesign of the Northline Delivery Intelligence overview page (`/`). It replaces the existing sidebar navigation with a horizontal top navigation bar, introduces a large Lodestar AI briefing panel, adds a 5-card KPI strip, and reorganizes content into a two-column layout (needs-attention + PI health) with a bottom section for recent findings and quick navigation.

The redesign stays within the existing Next.js 16 App Router architecture, reuses Northline design tokens, and integrates with the FastAPI backend via existing `/api/pis`, `/api/findings`, and Lodestar narrative endpoints.

### Goals
- Maximize horizontal content area by removing the 176px sidebar
- Surface AI-generated narrative insights prominently
- Provide at-a-glance KPI metrics without scrolling
- Clearly separate "needs attention" from "PI health" information
- Maintain full visual consistency with Northline design tokens

### Non-Goals
- No new backend API endpoints (use existing ones)
- No authentication changes
- No real-time WebSocket updates (SSE streaming for Lodestar only)

## Architecture

```mermaid
graph TD
    subgraph "Browser"
        A[app/layout.tsx] --> B[CommandCenterTopNav]
        A --> C[app/page.tsx - Overview]
        C --> D[ProgramHeader]
        C --> E[LodestarBriefing]
        C --> F[KPIStrip]
        C --> G[NeedsAttentionSection]
        C --> H[PIHealthSection]
        C --> I[BottomSection]
        I --> J[RecentFindingsList]
        I --> K[QuickNavigationGrid]
    end

    subgraph "API Layer"
        L[/api/pis]
        M[/api/findings]
        N[/api/pis/{pi}/features/{key}/lodestar SSE]
    end

    C -->|fetch| L
    C -->|fetch| M
    E -->|SSE stream| N
```

### Layout Strategy

The current layout uses `AppSidebar` (176px fixed left) + `TopNavBar` (utility bar). Command Center V2 replaces this with:

1. **CommandCenterTopNav**: Full-width fixed horizontal nav bar (deep-indigo background, 56px height) with brand lockup, horizontal nav links, and user profile block
2. **Main content area**: Full viewport width with `padding: var(--space-8) var(--space-6)` and `margin-top: 56px`

The `app/layout.tsx` will conditionally render either the old sidebar layout or the new top-nav layout. For the initial implementation, the overview page (`/`) uses the new layout while other pages retain the sidebar until migrated.

### Data Flow

The overview page is a **React Server Component** that fetches PI and findings data at request time (matching the existing `page.tsx` pattern). The Lodestar briefing panel is a client component that streams narrative content via SSE.

## Components and Interfaces

### CommandCenterTopNav

Replaces `AppSidebar` + `TopNavBar` for the overview page.

```typescript
// components/command-center/CommandCenterTopNav.tsx
interface CommandCenterTopNavProps {
  currentPath: string;
  userName: string;
  userInitials: string;
}

// Navigation items (fixed set)
const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/features", label: "Features" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/forecast", label: "Forecast" },
  { href: "/findings", label: "Findings" },
  { href: "/admin", label: "Admin" },
];
```

### ProgramHeader

Displays "Program overview" title with sync status.

```typescript
interface ProgramHeaderProps {
  lastSyncTimestamp: string | null;
  isSyncing: boolean;
}
```

### LodestarBriefing

Large AI narrative panel. Client component for SSE streaming.

```typescript
interface LodestarBriefingProps {
  initialNarrative?: string;
  version?: string;
  lastUpdated?: string;
}

interface BriefingState {
  headline: string;
  narrative: string;
  version: string;
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;
}
```

### KPIStrip

Horizontal row of 5 metric cards.

```typescript
interface KPIMetric {
  label: string;
  value: string | number;
  delta?: number;       // positive = improving, negative = worsening
  subtitle?: string;    // e.g., "Monte Carlo P50" or PI end date
}

interface KPIStripProps {
  metrics: KPIMetric[];
}
```

### NeedsAttentionSection

Left column with critical findings and AI recommendations.

```typescript
interface AttentionFinding {
  id: string;
  severity: "critical" | "warning";
  title: string;
  description: string;
  recommendation: string;
  category: string;
}

interface NeedsAttentionSectionProps {
  findings: AttentionFinding[];
  onDismiss?: (id: string) => void;
  onAddress?: (id: string) => void;
}
```

### PIHealthSection

Right column with PI progress and team health.

```typescript
interface TeamHealth {
  name: string;
  status: "healthy" | "at-risk" | "critical";
  completionPct: number;
}

interface PIHealthSectionProps {
  piName: string;
  overallCompletionPct: number;
  teams: TeamHealth[];
  daysRemaining: number;
}
```

### QuickNavigationGrid

Grid of 4 navigation cards.

```typescript
interface NavCard {
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType;
}

interface QuickNavigationGridProps {
  cards: NavCard[];
}
```

### Component File Structure

```
dashboard/components/command-center/
├── CommandCenterTopNav.tsx
├── ProgramHeader.tsx
├── LodestarBriefing.tsx
├── KPIStrip.tsx
├── KPICard.tsx
├── NeedsAttentionSection.tsx
├── AttentionFindingCard.tsx
├── PIHealthSection.tsx
├── TeamHealthRow.tsx
├── QuickNavigationGrid.tsx
├── RecentFindingsList.tsx
└── CommandCenterFooter.tsx
```

## Data Models

### API Response Types

```typescript
// Extended from existing lib/api.ts types

interface PIData {
  name: string;
  start_date: string | null;
  end_date: string | null;
  total_issues: number;
  done_issues: number;
  blocked_issues: number;
  pct_complete: number;
  critical_findings: number;
  health: string;  // "green" | "amber" | "red"
  sprints: SprintData[];
}

interface Finding {
  rule_id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  recommendation: string;
  issue_keys: string[];
}
```

### Derived View Models

```typescript
// KPI metrics derived from API data on the server
interface OverviewKPIs {
  sprintVelocity: { value: number; delta: number };
  featuresOnTrack: { onTrack: number; total: number; delta: number };
  activeBlockers: { count: number; delta: number };
  daysRemaining: { days: number; endDate: string };
  forecastConfidence: { percentage: number };
}

// Team health derived from PI sprints
interface DerivedTeamHealth {
  name: string;
  status: "healthy" | "at-risk" | "critical";
  completionPct: number;
}
```

### KPI Derivation Logic

KPI values are computed server-side from the existing API data:

| Metric | Source | Calculation |
|--------|--------|-------------|
| Sprint velocity | PI sprints | Sum of done_issues in active sprint, delta vs planned |
| Features on track | Features API | Count where pct_complete >= threshold |
| Active blockers | Findings (critical) | Count of severity=critical findings |
| Days remaining | PI end_date | Date diff from today to PI end |
| Forecast confidence | Engine output | Monte Carlo P50 from forecast endpoint |

### Delta Color Logic (Pure Function)

```typescript
function getDeltaColor(delta: number): string {
  if (delta > 0) return "var(--color-status-success)";  // teal
  if (delta < 0) return "var(--color-status-danger)";   // coral
  return "var(--color-text-secondary)";                  // neutral
}
```

### Severity Sort Logic (Pure Function)

```typescript
const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function sortBySeverity<T extends { severity: string }>(findings: T[]): T[] {
  return [...findings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
  );
}
```

### Team Health Status Derivation

```typescript
function deriveTeamStatus(completionPct: number, hasBlocker: boolean): "healthy" | "at-risk" | "critical" {
  if (hasBlocker || completionPct < 30) return "critical";
  if (completionPct < 60) return "at-risk";
  return "healthy";
}

function getHealthColor(status: "healthy" | "at-risk" | "critical"): string {
  if (status === "healthy") return "var(--color-status-success)";
  if (status === "at-risk") return "var(--color-status-warning)";
  return "var(--color-status-danger)";
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Delta color mapping

*For any* KPI metric delta value, the `getDeltaColor` function SHALL return `--color-status-success` (teal) when delta is positive, `--color-status-danger` (coral) when delta is negative, and `--color-text-secondary` (neutral) when delta is zero.

**Validates: Requirements 4.7, 4.8**

### Property 2: Findings severity sort order

*For any* array of findings with mixed severities (critical, warning, info), the `sortBySeverity` function SHALL return a new array where all critical findings precede all warning findings, and all warning findings precede all info findings, preserving relative order within each severity level.

**Validates: Requirements 5.2**

### Property 3: Finding rendering completeness

*For any* finding object with non-empty severity, title, description, and recommendation fields, the rendered `AttentionFindingCard` component SHALL display all four fields and include action buttons.

**Validates: Requirements 5.3, 5.4, 5.5**

### Property 4: Team health color mapping and emphasis

*For any* team with a health status, the `getHealthColor` function SHALL return teal for "healthy", amber for "at-risk", and coral for "critical". Additionally, *for any* team with "critical" status, the rendered `TeamHealthRow` SHALL apply visual emphasis styling.

**Validates: Requirements 6.3, 6.4, 6.5**

### Property 5: Progress bar value accuracy

*For any* numeric percentage value between 0 and 100, the `ProgressBar` component SHALL render with `aria-valuenow` equal to the clamped input value and a fill width proportional to the percentage.

**Validates: Requirements 6.2**

### Property 6: Recent findings badge rendering

*For any* finding in the recent findings list, the rendered output SHALL display a severity badge with the correct severity text and the finding title.

**Validates: Requirements 7.2**

## Error Handling

### API Failures

| Scenario | Behavior |
|----------|----------|
| `/api/pis` returns error | Display non-blocking error banner; KPI strip shows "--" placeholders |
| `/api/findings` returns error | Display non-blocking error banner; attention section shows empty state |
| Lodestar SSE timeout | Display "Unable to load briefing" with retry button |
| Lodestar SSE error event | Display error message inline in briefing panel |
| Network timeout (30s) | Show timeout message with retry action |

### Loading States

All content sections display skeleton placeholders during data fetch:
- KPI cards: pulsing rectangles matching card dimensions
- Briefing panel: 3 pulsing text lines
- Findings: 3 pulsing card shapes
- PI health: pulsing progress bars

### Empty States

| Section | Empty Condition | Display |
|---------|----------------|---------|
| Needs Attention | No critical/warning findings | "All clear — no items need attention" message |
| PI Health | No PI data | "No program increment data available" |
| Recent Findings | No findings | "No recent findings" |

### Clipboard Errors

If `navigator.clipboard.writeText` fails (e.g., permissions denied), display a toast notification with "Failed to copy — please copy manually" and fall back to selecting the text for manual copy.

## Testing Strategy

### Property-Based Tests (fast-check)

The project already uses `fast-check` (v4.8.0) with Vitest. Property-based tests will validate the correctness properties defined above.

**Configuration:**
- Minimum 100 iterations per property test
- Each property test references its design document property via tag comment
- Tag format: `// Feature: command-center-v2, Property {N}: {title}`

**Library:** fast-check (already in devDependencies)

**Test file:** `dashboard/components/command-center/command-center.property.test.ts`

Properties to implement:
1. Delta color mapping — test `getDeltaColor` with arbitrary integers
2. Severity sort stability — test `sortBySeverity` with arbitrary finding arrays
3. Finding rendering completeness — render `AttentionFindingCard` with generated findings
4. Health color mapping — test `getHealthColor` and `deriveTeamStatus` with arbitrary inputs
5. Progress bar accuracy — render `ProgressBar` with arbitrary percentages
6. Recent findings badge rendering — render with generated finding data

### Unit Tests (Vitest + React Testing Library)

Example-based tests for specific component behaviors:

- `CommandCenterTopNav`: renders all 6 nav links, active state highlights correctly, brand lockup present
- `ProgramHeader`: displays sync timestamp, shows loading indicator when syncing
- `LodestarBriefing`: renders version badge, handles SSE stream events, copy button triggers clipboard
- `KPIStrip`: renders 5 cards with correct labels
- `QuickNavigationGrid`: all 4 cards present and navigable
- `CommandCenterFooter`: "Powered by Lodestar AI" text present

### Integration Tests

- Overview page renders without errors with mocked API responses
- Overview page shows error banner when API fails
- Overview page displays loading skeletons during fetch
- Layout excludes AppSidebar on overview route

### Responsive Tests

- Verify CSS class changes at 1024px and 768px breakpoints (via media query testing or Playwright visual tests)

### Test File Organization

```
dashboard/components/command-center/
├── command-center.property.test.ts   # Property-based tests
├── CommandCenterTopNav.test.tsx       # Unit tests
├── KPIStrip.test.tsx                  # Unit tests
├── NeedsAttentionSection.test.tsx     # Unit tests
├── PIHealthSection.test.tsx           # Unit tests
└── LodestarBriefing.test.tsx          # Unit + integration tests
```
