# Northline Rebrand — Design Specification

**Source:** `Northline_Branding_Spec_v1.1.md`  
**Status:** Draft for review

## 1. Design Tokens

All tokens are defined as CSS custom properties in `dashboard/globals.css`. No hardcoded hex values are allowed in component files.

### 1.1 Color Tokens

```css
:root {
  /* Brand */
  --color-brand-deep-indigo:   #202670;
  --color-brand-indigo:        #4C4088;
  --color-brand-sky-blue:      #1D6EFF;
  --color-brand-teal:          #0F6038;
  --color-brand-amber:         #F5A623;
  --color-brand-coral:         #E85D46;
  --color-brand-slate:         #847488;
  --color-brand-stone:         #F2F4F6;

  /* Interactive */
  --color-interactive-primary:        var(--color-brand-indigo);
  --color-interactive-primary-hover:  #3A3170;
  --color-interactive-primary-active: #2D2659;
  --color-interactive-secondary:      var(--color-brand-sky-blue);

  /* Status */
  --color-status-success:     var(--color-brand-teal);
  --color-status-warning:     var(--color-brand-amber);
  --color-status-danger:      var(--color-brand-coral);
  --color-status-info:        var(--color-brand-sky-blue);
  --color-status-neutral:     var(--color-brand-slate);

  /* Status fills */
  --color-fill-success:  #E3F2EB;
  --color-fill-warning:  #FEF5E4;
  --color-fill-danger:   #FCECEA;
  --color-fill-info:     #E8EFFE;
  --color-fill-neutral:  #F2F4F6;

  /* Navigation */
  --color-nav-bg:          var(--color-brand-deep-indigo);
  --color-nav-text:        #FFFFFF;
  --color-nav-text-muted:  rgba(255, 255, 255, 0.65);
  --color-nav-active-bg:   var(--color-brand-indigo);
  --color-nav-active-text: #FFFFFF;

  /* Surfaces */
  --color-surface-page:    #F2F4F6;
  --color-surface-card:    #FFFFFF;
  --color-surface-overlay: rgba(14, 14, 26, 0.5);

  /* Text */
  --color-text-primary:   #0E0E1A;
  --color-text-secondary: #847488;
  --color-text-tertiary:  #B0AAB8;
  --color-text-inverse:   #FFFFFF;
  --color-text-link:      var(--color-brand-indigo);

  /* Borders */
  --color-border-default:  rgba(14, 14, 26, 0.12);
  --color-border-strong:   rgba(14, 14, 26, 0.24);
  --color-border-focus:    var(--color-brand-indigo);
}
```

### 1.2 Typography Tokens

```css
:root {
  --font-family-base: 'Inter', system-ui, sans-serif;

  --font-size-h1:      2rem;      /* 32px */
  --font-size-h2:      1.25rem;   /* 20px */
  --font-size-h3:      1rem;      /* 16px */
  --font-size-body:    0.875rem;  /* 14px */
  --font-size-label:   0.75rem;   /* 12px */
  --font-size-caption: 0.75rem;   /* 12px */

  --font-weight-bold:   700;
  --font-weight-semi:   600;
  --font-weight-medium: 500;
  --font-weight-normal: 400;

  --line-height-tight:  1.2;
  --line-height-snug:  1.4;
  --line-height-normal: 1.6;
}
```

### 1.3 Spacing & Radius Tokens

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-pill: 999px;
}
```

### 1.4 Shadow Tokens

```css
:root {
  --shadow-card:    0 1px 3px rgba(14, 14, 26, 0.08), 0 1px 2px rgba(14, 14, 26, 0.06);
  --shadow-drawer:  -4px 0 24px rgba(14, 14, 26, 0.12);
  --shadow-tooltip: 0 4px 12px rgba(14, 14, 26, 0.15);
}
```

## 2. Logo & Iconography

### 2.1 Logo
- SVG primary lockup: compass mark + "NORTHLINE" (Inter 700, Deep Indigo) + "DELIVERY INTELLIGENCE" (Inter 500, Deep Indigo) + "Powered by Lodestar AI" (Inter 400, Slate).
- Compact variant: mark + wordmark only.
- Icon variant: compass mark only, used at ≤48px.
- Minimum digital size: 160px wide.
- Clear space: equal to wordmark cap height on all sides.

### 2.2 Compass Mark
- 4-pointed directional form with equal horizontal/vertical axes.
- Point length-to-width ratio ~4:1; taper begins ~30% from base.
- Must be delivered as SVG; do not reconstruct from star/polygon shapes.

### 2.3 Lodestar AI Mark
- 6-pointed thin-line asterisk/sparkle, Sky Blue (`#1D6EFF`).
- Used only with "Lodestar AI" or "Powered by Lodestar AI" text.

### 2.4 Icons
- Tabler Icons outline only; no filled variants.
- Sizes: 18px inline, 20px navigation, 24px decorative.

## 3. Navigation Architecture

### 3.1 AppSidebar
- Fixed left, full height.
- Expanded 176px / collapsed 64px.
- Background: Deep Indigo.
- Active state: Indigo rounded pill inset 8px from edges.
- Inactive state: 65% white text.
- Hover state: `rgba(255, 255, 255, 0.08)` rounded rectangle.
- Bottom: `UserProfileBlock` (avatar + name + role).
- Routes: Overview, Features, Roadmap, Forecast, Findings, Admin.

### 3.2 TopNavBar
- Fixed top, 56px height, white background, bottom shadow.
- Spans content area to the right of AppSidebar.
- Contents: page title (H2), live data indicator, refresh button, search, notification bell, user avatar.

### 3.3 Mobile Navigation
- Bottom nav bar (60px tall) at ≤767px.
- 5 tabs: Overview, Features, Roadmap, Forecast, Findings.
- Active tab: Indigo icon; inactive: Slate.
- TopNavBar on mobile: hamburger + compass mark + NORTHLINE wordmark + compact Live indicator + avatar.

## 4. Component System

### 4.1 New Components

| Component | Path | Notes |
|-------------|------|-------|
| AppSidebar | `components/navigation/AppSidebar.tsx` | Replaces NavLinks |
| TopNavBar | `components/navigation/TopNavBar.tsx` | 56px utility bar |
| LiveDataIndicator | `components/navigation/LiveDataIndicator.tsx` | Green pill desktop; compact inline mobile |
| GlobalSearch | `components/navigation/GlobalSearch.tsx` | ⌘K/Ctrl+K trigger |
| NotificationBell | `components/navigation/NotificationBell.tsx` | Coral badge, max 99+ |
| UserProfileBlock | `components/navigation/UserProfileBlock.tsx` | Bottom of sidebar |
| AskLodestar | `components/shared/AskLodestar.tsx` | Outlined Indigo button with `ti-sparkles` |
| NorthlineInsightsStrip | `components/overview/NorthlineInsightsStrip.tsx` | 3 AI bullets on Overview |
| LodestarBriefingPanel | `components/overview/LodestarBriefingPanel.tsx` | Executive briefing CTA |
| RecentActivityFeed | `components/overview/RecentActivityFeed.tsx` | Right-column activity log |
| TopFindings | `components/overview/TopFindings.tsx` | Mobile-only findings summary |
| RoadmapTableView | `components/roadmap/RoadmapTableView.tsx` | Table alternative to Gantt |

### 4.2 Updated Components

| Component | Path | Change |
|-----------|------|--------|
| SummaryStrip | `components/roadmap/SummaryStrip.tsx` | Tokens + H1 resize review |
| GanttBar | `components/roadmap/GanttBar.tsx` | Semantic tokens only |
| GanttHeader | `components/roadmap/GanttHeader.tsx` | Tokens |
| FilterBar | `components/roadmap/FilterBar.tsx` | Active pill Indigo |
| TeamGroup | `components/roadmap/TeamGroup.tsx` | RAG badges semantic |
| FeatureRow | `components/roadmap/FeatureRow.tsx` | Hover/active states |
| DetailDrawer | `components/roadmap/DetailDrawer.tsx` | Tokens + 4-tab verification |
| LodestarPanel | `components/roadmap/LodestarPanel.tsx` | Sky Blue accent |
| HealthBadge | `components/HealthBadge.tsx` | Semantic tokens |
| PICard | `components/PICard.tsx` | Tokens + H1 review |
| TodayLine | `components/roadmap/TodayLine.tsx` | Indigo |
| SprintMiniGrid | `components/roadmap/SprintMiniGrid.tsx` | Tokens |
| ProgressBar | `components/ProgressBar.tsx` | Tokens |

### 4.3 Legacy Cleanup

| File | Action |
|------|--------|
| `components/NavLinks.tsx` | Decommission |
| `app/roadmap/gantt-bar.tsx` | Delete after confirming active import |
| `app/roadmap/styles.ts` | Migrate to Tailwind/tokens |
| `app/roadmap/types.ts` | Consolidate into `types/roadmap.ts` |

## 5. Responsive Design

### 5.1 Breakpoints

| Name | Min width | Behaviour |
|------|-----------|-----------|
| Desktop | ≥1280px | 220px sidebar (spec says 176px expanded) + content |
| Tablet | 768–1279px | 64px icon sidebar |
| Mobile Large | 414–767px | Bottom nav |
| Mobile | ≤413px | Bottom nav |

### 5.2 Key Behaviours

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| AppSidebar | 176px expanded | 64px icon-only | Hidden → bottom nav |
| KPI strip | 5 columns | 3 columns | 3+2 grid |
| Gantt timeline | Full 3-PI | Horizontal scroll | Current PI only |
| DetailDrawer | 480px | 360px | Full screen |
| LodestarPanel | In drawer | In drawer | Full screen |
| TopNavBar | Full | Search icon only | Logo + icons only |

## 6. Lodestar AI Surfaces

- Lodestar AI accent colour: Sky Blue `#1D6EFF`.
- LodestarPanel four states retained: Idle, Streaming, Complete, Error.
- NorthlineInsightsStrip: 3 static AI bullets on Overview.
- LodestarBriefingPanel: executive briefing CTA with Indigo primary button.

## 7. Design Principles

1. Decision First — answer the primary question before scrolling.
2. Risk Forward — surface risks early and visibly.
3. Explain the Why — every number has significance.
4. Source Traceability — every insight links to evidence.
5. Executive Scanability — key answers in under 30 seconds.

## 8. Open Design Decisions

- Dark mode deferred pending product sign-off.
- GlobalSearch, NotificationBell, LodestarBriefingPanel, RecentActivityFeed, RoadmapTableView, and AskLodestar interaction details require product/eng definition before build.
