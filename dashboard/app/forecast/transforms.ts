/**
 * Data transformation and forecasting utilities for the Forecast page.
 */
import type {
  APIPIData,
  APIRoadmapResponse,
  APIFeatureSummary,
  TransformedPI,
  TransformedFeature,
  VelocityStats,
  SprintTimelineEntry,
  SlipInfo,
  ScoredFeature,
  MonteCarloResult,
  PIForecast,
  VelocityChartPoint,
  SortMode,
} from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

const SPRINT_DAYS = 14;

// ─── Date Helpers ───────────────────────────────────────────────────────────

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function addDays(base: string | Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + Math.max(1, Math.round(n)));
  return d.toISOString().slice(0, 10);
}

// ─── Transform API responses ────────────────────────────────────────────────

/**
 * Transform /api/pis response.
 * Derives sprint state from dates (Jira's state field is unreliable).
 */
export function transformPIs(apiPIs: APIPIData[]): TransformedPI[] {
  const now = new Date();
  return (apiPIs ?? []).map(pi => ({
    name: pi.name.startsWith("PI ") ? pi.name : `PI ${pi.name}`,
    start: pi.start_date,
    end: pi.end_date,
    health: pi.health ?? "green",
    issuesTotal: pi.total_issues ?? 0,
    issuesDone: pi.done_issues ?? 0,
    issuesBlocked: pi.blocked_issues ?? 0,
    pctComplete: pi.pct_complete ?? 0,
    criticalFindings: pi.critical_findings ?? 0,
    sprints: (pi.sprints ?? [])
      .filter(s => s.start_date && s.end_date)
      .map(s => {
        const end = new Date(s.end_date!);
        const start = new Date(s.start_date!);
        const dateState = end < now ? "closed" as const
          : start <= now ? "active" as const
          : "future" as const;
        return {
          name: s.name,
          start: s.start_date!,
          end: s.end_date!,
          state: dateState,
          total: s.total_issues ?? 0,
          done: s.done_issues ?? 0,
          pct: s.pct_complete ?? 0,
        };
      }),
  }));
}

/**
 * Transform /api/roadmap response to feature list.
 */
export function transformRoadmapFeatures(roadmapJson: APIRoadmapResponse | null): TransformedFeature[] {
  const features = roadmapJson?.features ?? [];
  return features
    .filter(f => f.target_start_date && f.target_end_date)
    .map(f => ({
      key: f.issue_key,
      name: f.summary,
      status: f.status ?? "Unknown",
      assignee: f.assignee ?? "Unassigned",
      storiesTotal: f.story_total ?? 0,
      storiesDone: f.story_done ?? 0,
      pctComplete: f.pct_complete ?? 0,
      plannedStart: f.target_start_date!,
      plannedEnd: f.target_end_date!,
      team: f.issue_key?.startsWith("EVCOISC") ? "ISC"
        : f.issue_key?.startsWith("EVEXPNR") ? "Panthers"
        : f.issue_key?.startsWith("EVCOTSU") ? "TSU"
        : f.issue_key?.startsWith("EVIONEP") ? "IO"
        : "Other",
    }));
}

// ─── Velocity Calculation ───────────────────────────────────────────────────

/**
 * Calculate velocity stats using three approaches (in priority order):
 * 1. SP per sprint from story data
 * 2. SP per sprint estimated from PI throughput
 * 3. Issue count per sprint from PI throughput
 */
export function velocityStats(pis: TransformedPI[], rawFeatures: APIFeatureSummary[]): VelocityStats {
  const now = new Date();

  // Approach 1: SP grouped by sprint_name
  const spBySprint: Record<string, number> = {};
  let totalSPDone = 0;
  let totalSPAll = 0;
  let storiesWithSP = 0;

  (rawFeatures ?? []).forEach(feature => {
    (feature.stories ?? []).forEach(story => {
      const sp = story.story_points;
      if (sp != null && sp > 0) {
        storiesWithSP++;
        totalSPAll += sp;
        if (story.status_category === "done") {
          totalSPDone += sp;
          const key = story.sprint_name ?? "__unassigned__";
          spBySprint[key] = (spBySprint[key] ?? 0) + sp;
        }
      }
    });
  });

  const namedSprints = Object.keys(spBySprint).filter(k => k !== "__unassigned__" && spBySprint[k] > 0);
  if (namedSprints.length >= 2) {
    const vals = namedSprints.map(k => spBySprint[k]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    return {
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
      min: Math.round(Math.min(...vals) * 10) / 10,
      max: Math.round(Math.max(...vals) * 10) / 10,
      count: vals.length,
      unit: "SP",
      source: "sprint-SP",
      totalDone: Math.round(totalSPDone),
      totalAll: Math.round(totalSPAll),
    };
  }

  // Approach 2: SP per sprint estimated from PI throughput
  const pastPIs = pis.filter(pi => new Date(pi.end) < now && pi.issuesTotal > 0);

  if (storiesWithSP > 0 && pastPIs.length > 0) {
    const totalPISprintSlots = pastPIs.reduce((sum, pi) => {
      const days = Math.max(SPRINT_DAYS, Math.round((new Date(pi.end).getTime() - new Date(pi.start).getTime()) / 86400000));
      return sum + (days / SPRINT_DAYS);
    }, 0);
    if (totalPISprintSlots > 0 && totalSPDone > 0) {
      const mean = totalSPDone / totalPISprintSlots;
      const stdDev = mean * 0.25;
      return {
        mean: Math.round(mean * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        min: Math.round(mean * 0.7 * 10) / 10,
        max: Math.round(mean * 1.3 * 10) / 10,
        count: pastPIs.length,
        unit: "SP",
        source: "PI-SP",
        totalDone: Math.round(totalSPDone),
        totalAll: Math.round(totalSPAll),
      };
    }
  }

  // Approach 3: Issue count from PI throughput
  if (pastPIs.length > 0) {
    const velocities = pastPIs.map(pi => {
      const days = Math.max(SPRINT_DAYS, Math.round((new Date(pi.end).getTime() - new Date(pi.start).getTime()) / 86400000));
      const sprints = days / SPRINT_DAYS;
      return pi.issuesDone / sprints;
    });
    const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / velocities.length;
    return {
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
      min: Math.round(Math.min(...velocities) * 10) / 10,
      max: Math.round(Math.max(...velocities) * 10) / 10,
      count: velocities.length,
      unit: "issues",
      source: "PI-issues",
    };
  }

  return { mean: 5, stdDev: 2, min: 3, max: 8, count: 0, unit: "SP", source: "default" };
}

// ─── Sprint Timeline ────────────────────────────────────────────────────────

export function buildSprintTimeline(pis: TransformedPI[]): SprintTimelineEntry[] {
  const seen = new Set<string>();
  return pis
    .flatMap(pi => pi.sprints.map(s => ({ ...s, piName: pi.name, label: "" })))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; })
    .map(s => ({ ...s, label: s.name.replace("Sprint ", "") }));
}

// ─── Feature Slip Scoring ───────────────────────────────────────────────────

export function computeSlipScore(f: TransformedFeature, today: Date): number {
  const totalDays = daysBetween(f.plannedStart, f.plannedEnd);
  if (totalDays <= 0) return 0;
  const elapsed = Math.min(daysBetween(f.plannedStart, today.toISOString().slice(0, 10)), totalDays);
  const expectedPct = elapsed / totalDays;
  const actualPct = (f.pctComplete ?? 0) / 100;
  const gap = expectedPct - actualPct;
  const daysLeft = daysBetween(today.toISOString().slice(0, 10), f.plannedEnd);
  const urgency = daysLeft < 14 ? 3 : daysLeft < 30 ? 2 : 1;
  return Math.max(0, Math.min(100, Math.round(gap * 100 * urgency)));
}

export function slipLabel(score: number, status: string, daysLeft: number): SlipInfo {
  if (status === "Blocked") return { label: "Blocked", color: "var(--color-status-danger)", bg: "var(--color-fill-danger)" };
  if (daysLeft < 0) return { label: "Overdue", color: "var(--color-status-danger)", bg: "var(--color-fill-danger)" };
  if (score >= 55) return { label: "Will Slip", color: "var(--color-status-danger)", bg: "var(--color-fill-danger)" };
  if (score >= 25) return { label: "At Risk", color: "var(--color-status-warning)", bg: "var(--color-fill-warning)" };
  return { label: "On Track", color: "var(--color-status-success)", bg: "var(--color-fill-success)" };
}

export function scoreFeaturesWithSlip(
  features: TransformedFeature[],
  today: Date,
  sortBy: SortMode,
): ScoredFeature[] {
  return features
    .map(f => {
      const score = computeSlipScore(f, today);
      const todayStr = today.toISOString().slice(0, 10);
      const daysLeft = daysBetween(todayStr, f.plannedEnd);
      const totalDays = daysBetween(f.plannedStart, f.plannedEnd);
      const elapsed = Math.min(daysBetween(f.plannedStart, todayStr), totalDays);
      const expectedPct = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
      return { ...f, score, daysLeft, expectedPct, slip: slipLabel(score, f.status, daysLeft) };
    })
    .sort((a, b) =>
      sortBy === "slip" ? b.score - a.score :
      sortBy === "date" ? a.daysLeft - b.daysLeft :
      b.pctComplete - a.pctComplete
    );
}

// ─── Monte Carlo Simulation ─────────────────────────────────────────────────

function monteCarlo(remainingWork: number, mean: number, stdDev: number, simCount = 2000): { p50: number; p85: number } {
  if (remainingWork <= 0) return { p50: 0, p85: 0 };
  const completions: number[] = [];
  for (let i = 0; i < simCount; i++) {
    let work = remainingWork;
    let count = 0;
    while (work > 0 && count < 40) {
      const u = Math.random(), v = Math.random();
      const z = Math.sqrt(-2 * Math.log(u + 1e-10)) * Math.cos(2 * Math.PI * v);
      work -= Math.max(1, mean + stdDev * z);
      count++;
    }
    completions.push(count);
  }
  completions.sort((a, b) => a - b);
  return {
    p50: completions[Math.floor(simCount * 0.50)],
    p85: completions[Math.floor(simCount * 0.85)],
  };
}

// ─── PI Forecast Calculation ────────────────────────────────────────────────

export function computePIForecasts(
  pis: TransformedPI[],
  vStats: VelocityStats,
  sprintTimeline: SprintTimelineEntry[],
  today: Date,
): PIForecast[] {
  return pis.map(pi => {
    const remainingIssues = Math.max(0, pi.issuesTotal - pi.issuesDone);
    const isPast = new Date(pi.end) < today;
    const isFuture = new Date(pi.start) > today;

    if (isPast) return { ...pi, forecastStatus: "Complete", forecastColor: "var(--color-status-success)", mc: null };
    if (isFuture) return { ...pi, forecastStatus: "Planned", forecastColor: "var(--color-interactive-secondary)", mc: null };

    // Current PI — run Monte Carlo
    const remainingWork = vStats.unit === "SP" && (vStats.totalAll ?? 0) > 0
      ? Math.max(1, Math.round((vStats.totalAll!) * (1 - (pi.pctComplete / 100))))
      : Math.max(1, remainingIssues);
    const mc = monteCarlo(remainingWork, vStats.mean, vStats.stdDev);

    const allSprints = sprintTimeline.filter(s => s.start && s.end);
    const avgSprintDays = allSprints.length > 0
      ? Math.round(allSprints.reduce((sum, s) => sum + daysBetween(s.start, s.end), 0) / allSprints.length)
      : 14;

    const upcomingSprints = sprintTimeline
      .filter(s => s.end && new Date(s.end) > today)
      .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime());

    const p50Sprints = Math.max(1, mc.p50);
    const p85Sprints = Math.max(1, mc.p85);
    const todayStr = today.toISOString().slice(0, 10);
    const p50End = upcomingSprints[p50Sprints - 1]?.end ?? addDays(today, p50Sprints * avgSprintDays);
    const p85End = upcomingSprints[p85Sprints - 1]?.end ?? addDays(today, p85Sprints * avgSprintDays);
    const slipDays = daysBetween(pi.end, p50End);

    const forecastStatus = pi.health === "red" ? "At Risk"
      : slipDays > 14 ? "Will Slip"
      : slipDays > 0 ? "At Risk"
      : "On Track";
    const forecastColor = forecastStatus === "Will Slip" ? "var(--color-status-danger)"
      : forecastStatus === "At Risk" ? "var(--color-status-warning)" : "var(--color-status-success)";

    return { ...pi, forecastStatus, forecastColor, mc: { p50End, p85End, slipDays } };
  });
}

// ─── Velocity Chart Data ────────────────────────────────────────────────────

export function buildVelocityChartData(sprintTimeline: SprintTimelineEntry[], vStats: VelocityStats): VelocityChartPoint[] {
  return sprintTimeline.map(s => ({
    name: s.label,
    actual: s.state === "closed" ? s.done : null,
    planned: s.total || Math.round(vStats.mean),
    projected: s.state === "future" ? Math.round(vStats.mean) : null,
  }));
}

// ─── Utility ────────────────────────────────────────────────────────────────

export function healthColor(health: string): string {
  return health === "green" ? "var(--color-status-success)" : health === "amber" ? "var(--color-status-warning)" : "var(--color-status-danger)";
}

export const TEAM_COLORS: Record<string, string> = {
  ISC: "var(--color-interactive-secondary)",
  TSU: "var(--color-brand-indigo)",
  Panthers: "var(--color-status-success)",
  IO: "var(--color-interactive-primary)",
  Other: "var(--color-text-secondary)",
};
