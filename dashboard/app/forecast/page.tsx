// @ts-nocheck
"use client";

/**
 * PI Health Dashboard — Forecast Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Data priority:
 *   1. Live data from FastAPI  (/api/pis, /api/features, /api/roadmap)
 *   2. Mock data fallback if API is unreachable
 *
 * Field names match your actual Pydantic schemas in app/api/schemas.py
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";

// ─── FALLBACK MOCK DATA ───────────────────────────────────────────────────────
// Shaped exactly like your real API responses (schemas.py)

const MOCK_PIS = [
  {
    name: "26.1", start_date: "2026-01-05", end_date: "2026-03-06",
    total_issues: 62, done_issues: 58, blocked_issues: 0, pct_complete: 93.5,
    critical_findings: 0, health: "green",
    sprints: [
      { jira_id: 1, name: "Sprint 26.1.1", state: "closed", start_date: "2026-01-05", end_date: "2026-01-23", total_issues: 18, done_issues: 16, blocked_issues: 0, pct_complete: 88.9 },
      { jira_id: 2, name: "Sprint 26.1.2", state: "closed", start_date: "2026-01-26", end_date: "2026-02-13", total_issues: 20, done_issues: 18, blocked_issues: 0, pct_complete: 90.0 },
      { jira_id: 3, name: "Sprint 26.1.3", state: "closed", start_date: "2026-02-16", end_date: "2026-03-06", total_issues: 24, done_issues: 24, blocked_issues: 0, pct_complete: 100.0 },
    ],
  },
  {
    name: "26.2", start_date: "2026-03-09", end_date: "2026-06-19",
    total_issues: 76, done_issues: 31, blocked_issues: 2, pct_complete: 40.8,
    critical_findings: 1, health: "amber",
    sprints: [
      { jira_id: 4, name: "Sprint 26.2.1", state: "closed", start_date: "2026-03-09", end_date: "2026-03-27", total_issues: 22, done_issues: 19, blocked_issues: 0, pct_complete: 86.4 },
      { jira_id: 5, name: "Sprint 26.2.2", state: "closed", start_date: "2026-03-30", end_date: "2026-04-17", total_issues: 24, done_issues: 20, blocked_issues: 1, pct_complete: 83.3 },
      { jira_id: 6, name: "Sprint 26.2.3", state: "active", start_date: "2026-04-20", end_date: "2026-05-08", total_issues: 30, done_issues: 12, blocked_issues: 1, pct_complete: 40.0 },
      { jira_id: 7, name: "Sprint 26.2.4", state: "future", start_date: "2026-05-11", end_date: "2026-05-29", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0 },
      { jira_id: 8, name: "Sprint 26.2.5", state: "future", start_date: "2026-06-01", end_date: "2026-06-19", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0 },
    ],
  },
  { name: "26.3", start_date: "2026-06-22", end_date: "2026-09-11", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0, critical_findings: 0, health: "green", sprints: [] },
  { name: "26.4", start_date: "2026-09-14", end_date: "2026-12-04", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0, critical_findings: 0, health: "green", sprints: [] },
  { name: "26.5", start_date: "2026-12-07", end_date: "2027-02-26", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0, critical_findings: 0, health: "green", sprints: [] },
];

const MOCK_ROADMAP = {
  features: [
    { issue_key: "EVIONEP-1770", summary: "Historical Data Handling - Isaac SQL",      status: "Implementing",   assignee: "R. Sharma",  target_start_date: "2026-01-05", target_end_date: "2026-05-29", story_total: 10, story_done: 8,  story_in_progress: 1, story_todo: 1, pct_complete: 80.0 },
    { issue_key: "EVIONEP-1774", summary: "ISAAC SQL - Case Details (SOID)",           status: "In Progress",    assignee: "M. Patel",   target_start_date: "2026-02-01", target_end_date: "2026-06-12", story_total: 9,  story_done: 5,  story_in_progress: 2, story_todo: 2, pct_complete: 55.6 },
    { issue_key: "EVCOTSU-1034", summary: "Site of Care (SoC) - Widget & Workflow",    status: "Blocked",        assignee: "J. Shingre", target_start_date: "2026-02-16", target_end_date: "2026-05-22", story_total: 8,  story_done: 2,  story_in_progress: 0, story_todo: 6, pct_complete: 25.0 },
    { issue_key: "EVEXPNR-762",  summary: "Program Specific Rules - MSK Pain & Joint", status: "Working",        assignee: "B. Patil",   target_start_date: "2026-03-09", target_end_date: "2026-06-05", story_total: 7,  story_done: 4,  story_in_progress: 1, story_todo: 2, pct_complete: 57.1 },
    { issue_key: "EVCOTSU-HC",   summary: "Health Plan Config Chain",                  status: "In Development", assignee: "S. Patil",   target_start_date: "2026-01-26", target_end_date: "2026-05-15", story_total: 9,  story_done: 7,  story_in_progress: 1, story_todo: 1, pct_complete: 77.8 },
    { issue_key: "EVCOISC-183",  summary: "ABH AZ - Data Elements for Letter Gen",     status: "To Do",          assignee: "Unassigned", target_start_date: "2026-03-09", target_end_date: "2026-06-19", story_total: 4,  story_done: 0,  story_in_progress: 0, story_todo: 4, pct_complete: 0.0  },
    { issue_key: "EVEXPNR-754",  summary: "CAR/RAD/MSK - Member Eligibility Messaging",status: "Ready for QA",   assignee: "T. Kumar",   target_start_date: "2026-02-16", target_end_date: "2026-05-08", story_total: 7,  story_done: 6,  story_in_progress: 1, story_todo: 0, pct_complete: 85.7 },
  ],
  pis: [],
  sprints: [],
};

// ─── DATA TRANSFORMERS ────────────────────────────────────────────────────────
// Maps your actual FastAPI field names (schemas.py) to component internals.

/**
 * /api/pis → PISummary[]
 *
 * IMPORTANT: Jira sprint `state` field is unreliable — sprints in closed PIs
 * often remain marked "future". We derive all state from dates only.
 *
 * Sprint date-based state:
 *   - end_date < TODAY  → "closed"  (past sprint, velocity data)
 *   - start_date <= TODAY <= end_date → "active"
 *   - start_date > TODAY → "future"  (upcoming, for MC projection)
 *   - null dates → skip from velocity, include in upcoming if PI is current
 */
function transformPIs(apiPIs) {
  const now = new Date();
  return (apiPIs ?? []).map(pi => ({
    name:             pi.name.startsWith("PI ") ? pi.name : `PI ${pi.name}`,
    start:            pi.start_date,
    end:              pi.end_date,
    health:           pi.health ?? "green",
    issuesTotal:      pi.total_issues    ?? 0,
    issuesDone:       pi.done_issues     ?? 0,
    issuesBlocked:    pi.blocked_issues  ?? 0,
    pctComplete:      pi.pct_complete    ?? 0,
    criticalFindings: pi.critical_findings ?? 0,
    sprints: (pi.sprints ?? [])
      .filter(s => s.start_date && s.end_date)   // drop sprints with null dates
      .map(s => {
        const end   = new Date(s.end_date);
        const start = new Date(s.start_date);
        // Derive state purely from dates — do NOT trust s.state
        const dateState = end < now ? "closed"
                        : start <= now ? "active"
                        : "future";
        return {
          name:      s.name,
          start:     s.start_date,
          end:       s.end_date,
          state:     dateState,
          total:     s.total_issues ?? 0,
          done:      s.done_issues  ?? 0,
          pct:       s.pct_complete ?? 0,
        };
      }),
  }));
}

/**
 * /api/roadmap → RoadmapResponse
 * Feature fields: issue_key, summary, status, assignee,
 *                 target_start_date, target_end_date,
 *                 story_total, story_done, pct_complete
 */
function transformRoadmapFeatures(roadmapJson) {
  const features = roadmapJson?.features ?? [];
  return features
    .filter(f => f.target_start_date && f.target_end_date)
    .map(f => ({
      key:          f.issue_key,
      name:         f.summary,
      status:       f.status    ?? "Unknown",
      assignee:     f.assignee  ?? "Unassigned",
      storiesTotal: f.story_total ?? 0,
      storiesDone:  f.story_done  ?? 0,
      pctComplete:  f.pct_complete ?? 0,
      plannedStart: f.target_start_date,
      plannedEnd:   f.target_end_date,
      // Derive team from key prefix
      team: f.issue_key?.startsWith("EVCOISC")  ? "ISC"
          : f.issue_key?.startsWith("EVEXPNR")  ? "Panthers"
          : f.issue_key?.startsWith("EVCOTSU")  ? "TSU"
          : f.issue_key?.startsWith("EVIONEP")  ? "IO"
          : "Other",
    }));
}

// ─── FORECASTING UTILITIES ────────────────────────────────────────────────────

const TODAY = new Date();

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}


function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

/**
 * Velocity calculation — tries three approaches in order:
 *
 * 1. SP per sprint from story data (/api/features stories with sprint_name + story_points)
 *    Best quality — requires both story_points AND sprint_name populated in Jira.
 *
 * 2. SP per sprint estimated from PI throughput
 *    Uses total SP done across all stories in past PIs ÷ number of sprints in that PI.
 *    Works when SP are set but sprint assignments are unreliable.
 *
 * 3. Issue count per sprint from PI throughput (no SP data at all)
 *    Last resort — uses done_issues from PI level ÷ sprint count.
 *
 * Returns: { mean, stdDev, min, max, count, unit, source, totalDone, totalAll }
 */
function velocityStats(pis, rawFeatures) {
  const SPRINT_DAYS = 14;
  const now = new Date();

  // ── Approach 1: SP grouped by sprint_name ─────────────────────────────────
  const spBySprint = {};
  let totalSPDone = 0;
  let totalSPAll  = 0;
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

  // Only use sprint-level SP if we have at least 2 sprints with data
  const namedSprints = Object.keys(spBySprint).filter(k => k !== "__unassigned__" && spBySprint[k] > 0);
  if (namedSprints.length >= 2) {
    const vals     = namedSprints.map(k => spBySprint[k]);
    const mean     = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    return {
      mean:      Math.round(mean * 10) / 10,
      stdDev:    Math.round(Math.sqrt(variance) * 10) / 10,
      min:       Math.round(Math.min(...vals) * 10) / 10,
      max:       Math.round(Math.max(...vals) * 10) / 10,
      count:     vals.length,
      unit:      "SP",
      source:    "sprint-SP",
      totalDone: Math.round(totalSPDone),
      totalAll:  Math.round(totalSPAll),
    };
  }

  // ── Approach 2: SP per sprint estimated from PI throughput ────────────────
  // Get past PIs and sum their story SP totals from rawFeatures
  const pastPIs = pis.filter(pi => new Date(pi.end) < now && pi.issuesTotal > 0);

  if (storiesWithSP > 0 && pastPIs.length > 0) {
    // Group done SP by PI using story sprint_name → PI mapping isn't available,
    // so estimate: total done SP / total PI sprints across all past PIs
    const totalPISprintSlots = pastPIs.reduce((sum, pi) => {
      const days = Math.max(SPRINT_DAYS, Math.round((new Date(pi.end).getTime() - new Date(pi.start).getTime()) / 86400000));
      return sum + (days / SPRINT_DAYS);
    }, 0);
    if (totalPISprintSlots > 0 && totalSPDone > 0) {
      const mean   = totalSPDone / totalPISprintSlots;
      const stdDev = mean * 0.25; // assume 25% variance when we can't measure it directly
      return {
        mean:      Math.round(mean * 10) / 10,
        stdDev:    Math.round(stdDev * 10) / 10,
        min:       Math.round(mean * 0.7 * 10) / 10,
        max:       Math.round(mean * 1.3 * 10) / 10,
        count:     pastPIs.length,
        unit:      "SP",
        source:    "PI-SP",
        totalDone: Math.round(totalSPDone),
        totalAll:  Math.round(totalSPAll),
      };
    }
  }

  // ── Approach 3: Issue count from PI throughput (no SP data) ───────────────
  if (pastPIs.length > 0) {
    const velocities = pastPIs.map(pi => {
      const days    = Math.max(SPRINT_DAYS, Math.round((new Date(pi.end).getTime() - new Date(pi.start).getTime()) / 86400000));
      const sprints = days / SPRINT_DAYS;
      return pi.issuesDone / sprints;
    });
    const mean     = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / velocities.length;
    return {
      mean:   Math.round(mean * 10) / 10,
      stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
      min:    Math.round(Math.min(...velocities) * 10) / 10,
      max:    Math.round(Math.max(...velocities) * 10) / 10,
      count:  pastPIs.length,
      unit:   "issues",
      source: "PI-issues",
    };
  }

  // No usable data at all
  return { mean: 5, stdDev: 2, min: 3, max: 8, count: 0, unit: "SP", source: "default" };
}

/** Flat deduplicated sprint timeline across all PIs */
function buildSprintTimeline(pis) {
  const seen = new Set();
  return pis
    .flatMap(pi => pi.sprints.map(s => ({ ...s, piName: pi.name })))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; })
    .map(s => ({ ...s, label: s.name.replace("Sprint ", "") }));
}

/** Feature slip score 0–100 based on expected vs actual % done */
function computeSlipScore(f) {
  const totalDays = daysBetween(f.plannedStart, f.plannedEnd);
  if (totalDays <= 0) return 0;
  const elapsed     = Math.min(daysBetween(f.plannedStart, TODAY), totalDays);
  const expectedPct = elapsed / totalDays;
  const actualPct   = (f.pctComplete ?? 0) / 100;
  const gap         = expectedPct - actualPct;
  const daysLeft    = daysBetween(TODAY, f.plannedEnd);
  const urgency     = daysLeft < 14 ? 3 : daysLeft < 30 ? 2 : 1;
  return Math.max(0, Math.min(100, Math.round(gap * 100 * urgency)));
}

function slipLabel(score, status, daysLeft) {
  if (status === "Blocked")  return { label: "Blocked",   color: "#c0392b", bg: "#fdecea" };
  if (daysLeft < 0)          return { label: "Overdue",   color: "#c0392b", bg: "#fdecea" };
  if (score >= 55)           return { label: "Will Slip", color: "#c0392b", bg: "#fdecea" };
  if (score >= 25)           return { label: "At Risk",   color: "#d68910", bg: "#fef9e7" };
  return                            { label: "On Track",  color: "#1e8449", bg: "#eafaf1" };
}

/** Monte Carlo burn-down — issues remaining / velocity */
function monteCarlo(remainingIssues, mean, stdDev, simCount = 2000) {
  if (remainingIssues <= 0) return { p50: 0, p85: 0 };
  const completions = [];
  for (let i = 0; i < simCount; i++) {
    let issues = remainingIssues, count = 0;
    while (issues > 0 && count < 40) {
      const u = Math.random(), v = Math.random();
      const z = Math.sqrt(-2 * Math.log(u + 1e-10)) * Math.cos(2 * Math.PI * v);
      issues -= Math.max(1, mean + stdDev * z);
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

function healthColor(health) {
  return health === "green" ? "#1e8449" : health === "amber" ? "#d68910" : "#c0392b";
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────

const TEAM_COLORS = { ISC: "#2e86c1", TSU: "#7d3c98", Panthers: "#1e8449", IO: "#1a6ca8", Other: "#566573" };

function StatPill({ label, value, sub, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 8, padding: "14px 20px", minWidth: 130 }}>
      <div style={{ fontSize: 11, color: "#7a8a99", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#1a2b3c", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#7a8a99", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2b3c" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "#7a8a99", marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #dce3ea", borderTop: "3px solid #1a6ca8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#7a8a99" }}>Loading from API…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DataSourceBadge({ source }) {
  const live = source === "api";
  return (
    <div style={{ background: live ? "#eafaf1" : "#fef9e7", border: `1px solid ${live ? "#a9dfbf" : "#f9e4b7"}`, color: live ? "#1e8449" : "#d68910", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
      <span>{live ? "●" : "◌"}</span>
      {live ? "Live API data" : "Mock fallback (API unreachable)"}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ForecastPage() {
  const [activeTab,   setActiveTab]   = useState("overview");
  const [sortBy,      setSortBy]      = useState("slip");
  const [loading,     setLoading]     = useState(true);
  const [dataSource,  setDataSource]  = useState("mock");
  const [error,       setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [pis,         setPIs]         = useState([]);
  const [features,    setFeatures]    = useState([]);
  const [rawFeatures, setRawFeatures] = useState([]);
  const [velocityOverride, setVelocityOverride] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pisRes, roadmapRes, featuresRes] = await Promise.all([
        fetch("/api/pis"),
        fetch("/api/roadmap"),
        fetch("/api/features"),
      ]);
      if (!pisRes.ok) throw new Error(`/api/pis returned ${pisRes.status}`);

      const [pisJson, roadmapJson, featuresJson] = await Promise.all([
        pisRes.json(),
        roadmapRes.ok ? roadmapRes.json() : Promise.resolve(null),
        featuresRes.ok ? featuresRes.json() : Promise.resolve([]),
      ]);

      const transformedPIs = transformPIs(pisJson);
      // Pass raw features (with story_points per story) to velocity calculation
      const rawFeatures = Array.isArray(featuresJson) ? featuresJson : [];

      setPIs(transformedPIs);
      setFeatures(transformRoadmapFeatures(roadmapJson));
      // Store raw SP data for velocity calculation
      setRawFeatures(rawFeatures);
      setDataSource("api");
      setLastRefresh(new Date());
    } catch (err) {
      console.warn("Forecast: API unreachable, using mock data.", err.message);
      setPIs(transformPIs(MOCK_PIS));
      setFeatures(transformRoadmapFeatures(MOCK_ROADMAP));
      setDataSource("mock");
      setError("API unreachable — showing mock data. Start the backend and click Refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const vStatsRaw = useMemo(() => velocityStats(pis, rawFeatures), [pis, rawFeatures]);
  const vStats    = useMemo(() => {
    const ov = parseFloat(velocityOverride);
    if (!velocityOverride || isNaN(ov) || ov <= 0) return vStatsRaw;
    return { ...vStatsRaw, mean: ov, stdDev: Math.round(ov * 0.2 * 10) / 10, source: "manual-override" };
  }, [vStatsRaw, velocityOverride]);
  const sprintTimeline = useMemo(() => buildSprintTimeline(pis), [pis]);

  const velocityChartData = useMemo(() =>
    sprintTimeline.map(s => ({
      name:      s.label,
      actual:    s.state === "closed" ? s.done : null,
      planned:   s.total || Math.round(vStats.mean),
      projected: s.state === "future" ? Math.round(vStats.mean) : null,
    })),
  [sprintTimeline, vStats]);

  const scoredFeatures = useMemo(() =>
    features.map(f => {
      const score       = computeSlipScore(f);
      const daysLeft    = daysBetween(TODAY, f.plannedEnd);
      const totalDays   = daysBetween(f.plannedStart, f.plannedEnd);
      const elapsed     = Math.min(daysBetween(f.plannedStart, TODAY), totalDays);
      const expectedPct = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
      return { ...f, score, daysLeft, expectedPct, slip: slipLabel(score, f.status, daysLeft) };
    }).sort((a, b) =>
      sortBy === "slip" ? b.score - a.score :
      sortBy === "date" ? a.daysLeft - b.daysLeft :
      b.pctComplete - a.pctComplete
    ),
  [features, sortBy]);

  const piForecasts = useMemo(() => pis.map(pi => {
    const remainingIssues = Math.max(0, pi.issuesTotal - pi.issuesDone);
    const isPast    = new Date(pi.end)   < TODAY;
    const isFuture  = new Date(pi.start) > TODAY;
    const isCurrent = !isPast && !isFuture;
    const hColor    = healthColor(pi.health);

    // A past PI is Complete — end date already passed, no Monte Carlo needed
    if (isPast)   return { ...pi, forecastStatus: "Complete", forecastColor: "#1e8449", mc: null };
    if (isFuture) return { ...pi, forecastStatus: "Planned",  forecastColor: "#2e86c1", mc: null };
    // Current PI — run Monte Carlo

    // Remaining work in same unit as velocity
    // If SP: use total SP remaining from feature stories; fallback to issue count
    const remainingWork = vStats.unit === "SP" && (vStats.totalAll ?? 0) > 0
      ? Math.max(1, Math.round((vStats.totalAll) * (1 - (pi.pctComplete / 100))))
      : Math.max(1, remainingIssues);
    const mc = monteCarlo(remainingWork, vStats.mean, vStats.stdDev);

    // Average sprint length from all sprints with known dates (default 14 days)
    const allSprints    = sprintTimeline.filter(s => s.start && s.end);
    const avgSprintDays = allSprints.length > 0
      ? Math.round(allSprints.reduce((sum, s) => sum + daysBetween(s.start, s.end), 0) / allSprints.length)
      : 14;

    // Helper: add N days to a date, always returning a future date string
    const addDays = (base, n) => {
      const d = new Date(base);
      d.setDate(d.getDate() + Math.max(1, Math.round(n)));
      return d.toISOString().slice(0, 10);
    };

    // Upcoming sprints = those whose END date is still in the future
    // Sorted by end date so index 0 = the next sprint to close
    const upcomingSprints = sprintTimeline
      .filter(s => s.end && new Date(s.end) > TODAY)
      .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime());

    // Map Monte Carlo sprint counts onto real sprint end dates.
    // mc.p50 = 1 means "done within 1 more sprint" → index 0 of upcomingSprints
    // If we run out of known sprint dates, project forward from today using avg length
    const p50Sprints = Math.max(1, mc.p50);
    const p85Sprints = Math.max(1, mc.p85);
    const p50End = upcomingSprints[p50Sprints - 1]?.end ?? addDays(TODAY, p50Sprints * avgSprintDays);
    const p85End = upcomingSprints[p85Sprints - 1]?.end ?? addDays(TODAY, p85Sprints * avgSprintDays);
    const slipDays = daysBetween(pi.end, p50End);
    const forecastStatus = pi.health === "red"   ? "At Risk"
                         : slipDays > 14          ? "Will Slip"
                         : slipDays > 0           ? "At Risk"
                         : "On Track";
    const forecastColor  = forecastStatus === "Will Slip" ? "#c0392b"
                         : forecastStatus === "At Risk"   ? "#d68910" : "#1e8449";

    return { ...pi, forecastStatus, forecastColor, mc: { p50End, p85End, slipDays } };
  }), [pis, vStats, sprintTimeline]);

  const atRiskCount  = scoredFeatures.filter(f => f.slip.label !== "On Track").length;
  const blockedCount = scoredFeatures.filter(f => f.slip.label === "Blocked").length;

  const tabs = [
    { id: "overview", label: "📊 PI Forecast" },
    { id: "velocity", label: "⚡ Velocity Trends" },
    { id: "features", label: "🎯 Feature Slip Risk" },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ background: "#1a2b3c", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "#7fb3d3", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>Cigna Commercial · ISAAC to IO Migration</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>📈 Forecast &amp; Predictive Analytics</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <DataSourceBadge source={dataSource} />
          {lastRefresh && <div style={{ background: "#2e4057", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "#a8c4d8" }}>🕐 {lastRefresh.toLocaleTimeString()}</div>}
          <button onClick={loadData} style={{ background: "#2e4057", border: "1px solid #4a6080", borderRadius: 6, padding: "5px 14px", fontSize: 12, color: "#a8c4d8", cursor: "pointer", fontWeight: 600 }}>⟳ Refresh</button>
        </div>
      </div>

      {error && <div style={{ background: "#fef9e7", borderBottom: "1px solid #f9e4b7", padding: "10px 28px", fontSize: 12, color: "#7d6608" }}>⚠️ {error}</div>}

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #dce3ea", padding: "0 28px", display: "flex" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 20px", fontSize: 13, fontWeight: 600, color: activeTab === t.id ? "#1a6ca8" : "#5a6a7a", borderBottom: activeTab === t.id ? "2px solid #1a6ca8" : "2px solid transparent" }}>{t.label}</button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ padding: "24px 28px" }}>

          {/* ══ TAB: PI FORECAST ══ */}
          {activeTab === "overview" && (
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <StatPill label="PIs Tracked"      value={pis.length}       sub={pis.length ? `${pis[0].name} → ${pis[pis.length-1].name}` : "—"} />
                <StatPill label="Features"          value={features.length}  sub="with planned dates" />
                <StatPill label="Avg Velocity"      value={`${vStats.mean}`} sub={`${vStats.unit ?? "SP"}/sprint · ${
    vStats.source === "manual-override" ? "⚠ manual override" :
    vStats.source === "sprint-SP"  ? `${vStats.count} sprints w/ SP` :
    vStats.source === "PI-SP"      ? `${vStats.count} PI(s) SP total` :
    vStats.source === "PI-issues"  ? `${vStats.count} PI(s) issue count` :
    "default estimate"
  }`} color={vStats.source === "manual-override" ? "#d68910" : "#1a6ca8"} />
                <StatPill label="Features At Risk"  value={atRiskCount}      sub={`of ${features.length}`} color="#d68910" />
                <StatPill label="Blocked"           value={blockedCount}     sub="features" color="#c0392b" />
              </div>

              {/* Velocity override control */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, background: "#fff", border: "1px solid #dce3ea", borderRadius: 8, padding: "10px 16px", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#5a6a7a", fontWeight: 600 }}>Velocity Override</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder={`Calculated: ${vStatsRaw.mean}`}
                  value={velocityOverride}
                  onChange={e => setVelocityOverride(e.target.value)}
                  style={{ width: 130, padding: "5px 10px", fontSize: 13, border: "1px solid #dce3ea", borderRadius: 6, color: "#1a2b3c", outline: "none" }}
                />
                <span style={{ fontSize: 12, color: "#7a8a99" }}>{vStats.unit ?? "SP"}/sprint</span>
                {velocityOverride && (
                  <button onClick={() => setVelocityOverride("")} style={{ background: "#fdecea", border: "1px solid #f5c6c6", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#c0392b", cursor: "pointer", fontWeight: 600 }}>✕ Clear</button>
                )}
                <span style={{ fontSize: 11, color: velocityOverride ? "#d68910" : "#7a8a99", marginLeft: 4 }}>
                  {velocityOverride
                    ? `⚠ Using manual override (calculated: ${vStatsRaw.mean})`
                    : `Using calculated velocity from ${vStatsRaw.source === "sprint-SP" ? `${vStatsRaw.count} sprints` : vStatsRaw.source === "PI-issues" ? `${vStatsRaw.count} PI(s)` : "default estimate"}`}
                </span>
              </div>

              <SectionHeader
                title="Program Increment Forecasts"
                subtitle={`Monte Carlo · 2,000 simulations · ${vStats.mean} ${vStats.unit ?? "SP"}/sprint · ${
    vStats.source === "manual-override" ? `manual override (calculated was ${vStatsRaw.mean})` :
    vStats.source === "sprint-SP" ? `measured from ${vStats.count} sprints` :
    vStats.source === "PI-SP"     ? `estimated from PI SP totals` :
    vStats.source === "PI-issues" ? `estimated from PI issue throughput` :
    "using default estimate — upload more data via /admin"
  }`}
              />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14, marginBottom: 28 }}>
                {piForecasts.map(pi => (
                  <div key={pi.name} style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 10, overflow: "hidden", borderTop: `3px solid ${pi.forecastColor}` }}>
                    <div style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2b3c" }}>{pi.name}</div>
                          <div style={{ fontSize: 11, color: "#7a8a99", marginTop: 2 }}>{formatDate(pi.start)} → {formatDate(pi.end)}</div>
                        </div>
                        <span style={{ background: pi.forecastColor + "18", color: pi.forecastColor, border: `1px solid ${pi.forecastColor}40`, borderRadius: 12, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{pi.forecastStatus}</span>
                      </div>

                      {/* API health indicator */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: "#7a8a99" }}>API Health</span>
                        <span style={{ background: healthColor(pi.health) + "18", color: healthColor(pi.health), border: `1px solid ${healthColor(pi.health)}30`, borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{pi.health}</span>
                        {pi.criticalFindings > 0 && <span style={{ fontSize: 11, color: "#c0392b" }}>⚠ {pi.criticalFindings} critical finding{pi.criticalFindings > 1 ? "s" : ""}</span>}
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: "#7a8a99" }}>Issue Progress</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#1a2b3c" }}>{pi.issuesDone}/{pi.issuesTotal} ({Math.round(pi.pctComplete)}%)</span>
                        </div>
                        <div style={{ background: "#edf2f7", borderRadius: 4, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(pi.pctComplete, 100)}%`, background: pi.forecastColor, height: "100%", borderRadius: 4 }} />
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: "#5a6a7a", marginBottom: 10 }}>
                        🚫 {pi.issuesBlocked} blocked &nbsp;·&nbsp; {pi.sprints.length} sprints
                      </div>

                      {/* Monte Carlo — active PI only */}
                      {pi.mc && (
                        <div style={{ background: "#f7fafc", border: "1px solid #dce3ea", borderRadius: 6, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, color: "#7a8a99", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Monte Carlo · 2,000 simulations</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {[
                              { label: "P50 — likely",   val: formatDate(pi.mc.p50End), color: "#1e8449" },
                              { label: "P85 — cautious", val: formatDate(pi.mc.p85End), color: "#d68910" },
                            ].map(({ label, val, color }) => (
                              <div key={label} style={{ background: "#fff", border: `1px solid ${color}30`, borderRadius: 5, padding: "6px 8px", textAlign: "center" }}>
                                <div style={{ fontSize: 10, color, fontWeight: 700 }}>{label}</div>
                                <div style={{ fontSize: 12, color: "#1a2b3c", fontWeight: 600, marginTop: 2 }}>{val}</div>
                              </div>
                            ))}
                          </div>
                          {pi.mc.slipDays > 0 && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 8, fontWeight: 600 }}>⚠ P50 projects {pi.mc.slipDays}d past planned end</div>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ TAB: VELOCITY TRENDS ══ */}
          {activeTab === "velocity" && (
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <StatPill label="Mean Velocity" value={`${vStats.mean}`}            sub={`${vStats.unit ?? "SP"}/sprint · ${vStats.count} sprints measured`} color="#1a6ca8" />
                <StatPill label="Std Deviation" value={`±${vStats.stdDev}`}         sub="sprint variability" />
                <StatPill label="Best Sprint"   value={vStats.max ?? "—"}           color="#1e8449" />
                <StatPill label="Worst Sprint"  value={vStats.min ?? "—"}           color="#c0392b" />
              </div>

              <SectionHeader title="Sprint Velocity — Actuals + Projection" subtitle="Issues completed per sprint. Source: Stories CSV via /admin. Dashed = projected at mean velocity." />
              <div style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 10, padding: "20px 16px", marginBottom: 24 }}>
                {velocityChartData.length === 0
                  ? <div style={{ textAlign: "center", padding: 40, color: "#7a8a99", fontSize: 13 }}>No sprint data — upload a Stories CSV via <strong>/admin</strong>.</div>
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={velocityChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a6ca8" stopOpacity={0.18}/><stop offset="95%" stopColor="#1a6ca8" stopOpacity={0}/></linearGradient>
                          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7fb3d3" stopOpacity={0.12}/><stop offset="95%" stopColor="#7fb3d3" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#7a8a99" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#7a8a99" }} domain={[0, "auto"]} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #dce3ea" }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <ReferenceLine y={vStats.mean} stroke="#1a6ca8" strokeDasharray="4 4" label={{ value: `Avg ${vStats.mean}`, fontSize: 10, fill: "#1a6ca8", position: "right" }} />
                        <Area type="monotone" dataKey="actual"    name="Actual"    stroke="#1a6ca8" strokeWidth={2} fill="url(#ag)" dot={{ r: 4, fill: "#1a6ca8" }} connectNulls={false} />
                        <Area type="monotone" dataKey="projected" name="Projected" stroke="#7fb3d3" strokeWidth={2} strokeDasharray="5 4" fill="url(#pg)" dot={{ r: 3, fill: "#7fb3d3" }} connectNulls={false} />
                        <Area type="monotone" dataKey="planned"   name="Planned"   stroke="#d68910" strokeWidth={1.5} strokeDasharray="2 3" fill="none" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
              </div>

              <SectionHeader title="Sprint-by-Sprint Breakdown" />
              <div style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f7fafc", borderBottom: "1px solid #dce3ea" }}>
                      {["Sprint", "PI", "State", "Issues Done", "Issues Total", "% Complete"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#5a6a7a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sprintTimeline.map(s => (
                      <tr key={s.name} style={{ borderBottom: "1px solid #f0f4f8", background: s.state === "future" ? "#fafcfe" : "#fff" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: s.state === "future" ? "#7a8a99" : "#1a2b3c" }}>{s.name}</td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "#7a8a99" }}>{s.piName}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ background: s.state === "closed" ? "#eafaf1" : s.state === "active" ? "#ebf5fb" : "#edf2f7", color: s.state === "closed" ? "#1e8449" : s.state === "active" ? "#1a6ca8" : "#5a6a7a", borderRadius: 10, padding: "2px 8px", fontSize: 11 }}>
                            {s.state}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", fontWeight: 600 }}>{s.state !== "future" ? s.done : <span style={{ color: "#b0bec5" }}>—</span>}</td>
                        <td style={{ padding: "10px 16px", color: "#5a6a7a" }}>{s.total || <span style={{ color: "#b0bec5" }}>{Math.round(vStats.mean)} est.</span>}</td>
                        <td style={{ padding: "10px 16px" }}>
                          {s.state !== "future"
                            ? <span style={{ color: s.pct >= 80 ? "#1e8449" : s.pct >= 50 ? "#d68910" : "#c0392b", fontWeight: 600 }}>{Math.round(s.pct)}%</span>
                            : <span style={{ color: "#b0bec5" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                    {sprintTimeline.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#7a8a99", fontSize: 13 }}>No sprint data — upload a Stories CSV via <strong>/admin</strong>.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ TAB: FEATURE SLIP RISK ══ */}
          {activeTab === "features" && (
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                <StatPill label="Will Slip" value={scoredFeatures.filter(f => f.slip.label === "Will Slip").length} color="#c0392b" />
                <StatPill label="At Risk"   value={scoredFeatures.filter(f => f.slip.label === "At Risk").length}   color="#d68910" />
                <StatPill label="Blocked"   value={blockedCount} color="#c0392b" />
                <StatPill label="On Track"  value={scoredFeatures.filter(f => f.slip.label === "On Track").length}  color="#1e8449" />
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#7a8a99" }}>Sort:</span>
                  {[["slip","Slip Score"],["date","Due Date"],["pct","% Done"]].map(([val, lbl]) => (
                    <button key={val} onClick={() => setSortBy(val)} style={{ background: sortBy === val ? "#1a6ca8" : "#fff", color: sortBy === val ? "#fff" : "#5a6a7a", border: `1px solid ${sortBy === val ? "#1a6ca8" : "#dce3ea"}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>{lbl}</button>
                  ))}
                </div>
              </div>

              <SectionHeader title="Feature Slip Risk Analysis" subtitle="Score = (expected % done − actual % done) × urgency. Source: Roadmap XLSX via /admin." />

              {scoredFeatures.length === 0
                ? <div style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 10, padding: 40, textAlign: "center", color: "#7a8a99" }}>No features with planned dates. Upload a Roadmap XLSX via <strong>/admin</strong>.</div>
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {scoredFeatures.map(f => (
                      <div key={f.key} style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 10, overflow: "hidden", borderLeft: `4px solid ${f.slip.color}` }}>
                        <div style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                                <span style={{ background: (TEAM_COLORS[f.team]||"#566573")+"18", color: TEAM_COLORS[f.team]||"#566573", border: `1px solid ${(TEAM_COLORS[f.team]||"#566573")}30`, borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{f.team}</span>
                                <span style={{ fontSize: 11, color: "#7a8a99" }}>{f.key}</span>
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2b3c", marginBottom: 2 }}>{f.name}</div>
                              <div style={{ fontSize: 11, color: "#7a8a99" }}>
                                {formatDate(f.plannedStart)} → {formatDate(f.plannedEnd)} · {f.assignee}
                                {f.daysLeft >= 0 ? ` · ${f.daysLeft}d remaining` : ` · ${Math.abs(f.daysLeft)}d overdue`}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 9, color: "#7a8a99", textTransform: "uppercase", letterSpacing: "0.05em" }}>Slip Score</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: f.slip.color, lineHeight: 1.1 }}>{f.score}</div>
                              </div>
                              <span style={{ background: f.slip.bg, color: f.slip.color, border: `1px solid ${f.slip.color}40`, borderRadius: 12, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{f.slip.label}</span>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                            {[
                              { label: "Expected % Done", pct: f.expectedPct, color: "#7a8a99" },
                              { label: "Actual % Done",   pct: Math.round(f.pctComplete), color: "#1a6ca8" },
                            ].map(({ label, pct, color }) => (
                              <div key={label}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                  <span style={{ fontSize: 11, color: "#7a8a99" }}>{label}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}%</span>
                                </div>
                                <div style={{ background: "#edf2f7", borderRadius: 4, height: 6, overflow: "hidden" }}>
                                  <div style={{ width: `${Math.min(pct, 100)}%`, background: color, height: "100%", borderRadius: 4 }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#5a6a7a" }}>
                            <span>📝 {f.storiesDone}/{f.storiesTotal} stories</span>
                            <span style={{ color: f.slip.color }}>● {f.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



