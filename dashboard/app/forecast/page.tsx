"use client";

/**
 * PI Health Dashboard — Forecast Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Data priority:
 *   1. Live data from FastAPI  (/api/pis, /api/features, /api/roadmap)
 *   2. Mock data fallback if API is unreachable
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";

import type {
  TransformedPI, TransformedFeature, VelocityStats,
  SprintTimelineEntry, PIForecast, ScoredFeature,
  APIFeatureSummary, APIRoadmapResponse, APIPIData,
  ForecastTab, SortMode, VelocityChartPoint,
} from "./types";
import {
  transformPIs, transformRoadmapFeatures, velocityStats,
  buildSprintTimeline, scoreFeaturesWithSlip, computePIForecasts,
  buildVelocityChartData, healthColor, formatDate, TEAM_COLORS,
} from "./transforms";
import { MOCK_PIS, MOCK_ROADMAP } from "./mock-data";
import { StatPill, SectionHeader, LoadingSpinner, DataSourceBadge } from "./components";

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ForecastPage() {
  const [activeTab, setActiveTab] = useState<ForecastTab>("overview");
  const [sortBy, setSortBy] = useState<SortMode>("slip");
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"api" | "mock">("mock");
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [pis, setPIs] = useState<TransformedPI[]>([]);
  const [features, setFeatures] = useState<TransformedFeature[]>([]);
  const [rawFeatures, setRawFeatures] = useState<APIFeatureSummary[]>([]);
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
        pisRes.json() as Promise<APIPIData[]>,
        roadmapRes.ok ? (roadmapRes.json() as Promise<APIRoadmapResponse>) : Promise.resolve(null),
        featuresRes.ok ? (featuresRes.json() as Promise<APIFeatureSummary[]>) : Promise.resolve([]),
      ]);

      setPIs(transformPIs(pisJson));
      setFeatures(transformRoadmapFeatures(roadmapJson));
      setRawFeatures(Array.isArray(featuresJson) ? featuresJson : []);
      setDataSource("api");
      setLastRefresh(new Date());
    } catch (err: unknown) {
      console.warn("Forecast: API unreachable, using mock data.", (err as Error).message);
      setPIs(transformPIs(MOCK_PIS));
      setFeatures(transformRoadmapFeatures(MOCK_ROADMAP));
      setDataSource("mock");
      setError("API unreachable — showing mock data. Start the backend and click Refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const vStatsRaw = useMemo(() => velocityStats(pis, rawFeatures), [pis, rawFeatures]);
  const vStats: VelocityStats = useMemo(() => {
    const ov = parseFloat(velocityOverride);
    if (!velocityOverride || isNaN(ov) || ov <= 0) return vStatsRaw;
    return { ...vStatsRaw, mean: ov, stdDev: Math.round(ov * 0.2 * 10) / 10, source: "manual-override" as const };
  }, [vStatsRaw, velocityOverride]);

  const sprintTimeline = useMemo(() => buildSprintTimeline(pis), [pis]);
  const velocityChartData = useMemo(() => buildVelocityChartData(sprintTimeline, vStats), [sprintTimeline, vStats]);
  const today = useMemo(() => new Date(), []);
  const scoredFeatures = useMemo(() => scoreFeaturesWithSlip(features, today, sortBy), [features, today, sortBy]);
  const piForecasts = useMemo(() => computePIForecasts(pis, vStats, sprintTimeline, today), [pis, vStats, sprintTimeline, today]);

  const atRiskCount = scoredFeatures.filter(f => f.slip.label !== "On Track").length;
  const blockedCount = scoredFeatures.filter(f => f.slip.label === "Blocked").length;

  const tabs: { id: ForecastTab; label: string }[] = [
    { id: "overview", label: "📊 PI Forecast" },
    { id: "velocity", label: "⚡ Velocity Trends" },
    { id: "features", label: "🎯 Feature Slip Risk" },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ background: "#1a2b3c", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "#7fb3d3", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>Delivery intelligence</div>
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
                <StatPill label="PIs Tracked" value={pis.length} sub={pis.length ? `${pis[0].name} → ${pis[pis.length - 1].name}` : "—"} />
                <StatPill label="Features" value={features.length} sub="with planned dates" />
                <StatPill label="Avg Velocity" value={`${vStats.mean}`} sub={`${vStats.unit}/sprint · ${
                  vStats.source === "manual-override" ? "⚠ manual override" :
                  vStats.source === "sprint-SP" ? `${vStats.count} sprints w/ SP` :
                  vStats.source === "PI-SP" ? `${vStats.count} PI(s) SP total` :
                  vStats.source === "PI-issues" ? `${vStats.count} PI(s) issue count` :
                  "default estimate"}`} color={vStats.source === "manual-override" ? "#d68910" : "#1a6ca8"} />
                <StatPill label="Features At Risk" value={atRiskCount} sub={`of ${features.length}`} color="#d68910" />
                <StatPill label="Blocked" value={blockedCount} sub="features" color="#c0392b" />
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
                <span style={{ fontSize: 12, color: "#7a8a99" }}>{vStats.unit}/sprint</span>
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
                subtitle={`Monte Carlo · 2,000 simulations · ${vStats.mean} ${vStats.unit}/sprint · ${
                  vStats.source === "manual-override" ? `manual override (calculated was ${vStatsRaw.mean})` :
                  vStats.source === "sprint-SP" ? `measured from ${vStats.count} sprints` :
                  vStats.source === "PI-SP" ? "estimated from PI SP totals" :
                  vStats.source === "PI-issues" ? "estimated from PI issue throughput" :
                  "using default estimate — upload more data via /admin"}`}
              />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14, marginBottom: 28 }}>
                {piForecasts.map(pi => (
                  <PIForecastCard key={pi.name} pi={pi} />
                ))}
              </div>
            </div>
          )}

          {/* ══ TAB: VELOCITY TRENDS ══ */}
          {activeTab === "velocity" && (
            <VelocityTab
              vStats={vStats}
              velocityChartData={velocityChartData}
              sprintTimeline={sprintTimeline}
            />
          )}

          {/* ══ TAB: FEATURE SLIP RISK ══ */}
          {activeTab === "features" && (
            <FeatureSlipTab
              scoredFeatures={scoredFeatures}
              features={features}
              blockedCount={blockedCount}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components (below to keep single file manageable) ──────────────────

function PIForecastCard({ pi }: { pi: PIForecast }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 10, overflow: "hidden", borderTop: `3px solid ${pi.forecastColor}` }}>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2b3c" }}>{pi.name}</div>
            <div style={{ fontSize: 11, color: "#7a8a99", marginTop: 2 }}>{formatDate(pi.start)} → {formatDate(pi.end)}</div>
          </div>
          <span style={{ background: pi.forecastColor + "18", color: pi.forecastColor, border: `1px solid ${pi.forecastColor}40`, borderRadius: 12, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{pi.forecastStatus}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: "#7a8a99" }}>API Health</span>
          <span style={{ background: healthColor(pi.health) + "18", color: healthColor(pi.health), border: `1px solid ${healthColor(pi.health)}30`, borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{pi.health}</span>
          {pi.criticalFindings > 0 && <span style={{ fontSize: 11, color: "#c0392b" }}>⚠ {pi.criticalFindings} critical finding{pi.criticalFindings > 1 ? "s" : ""}</span>}
        </div>

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

        {pi.mc && (
          <div style={{ background: "#f7fafc", border: "1px solid #dce3ea", borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#7a8a99", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Monte Carlo · 2,000 simulations</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "P50 — likely", val: formatDate(pi.mc.p50End), color: "#1e8449" },
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
  );
}

function VelocityTab({ vStats, velocityChartData, sprintTimeline }: { vStats: VelocityStats; velocityChartData: VelocityChartPoint[]; sprintTimeline: SprintTimelineEntry[] }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatPill label="Mean Velocity" value={`${vStats.mean}`} sub={`${vStats.unit}/sprint · ${vStats.count} sprints measured`} color="#1a6ca8" />
        <StatPill label="Std Deviation" value={`±${vStats.stdDev}`} sub="sprint variability" />
        <StatPill label="Best Sprint" value={vStats.max ?? "—"} color="#1e8449" />
        <StatPill label="Worst Sprint" value={vStats.min ?? "—"} color="#c0392b" />
      </div>

      <SectionHeader title="Sprint Velocity — Actuals + Projection" subtitle="Issues completed per sprint. Dashed = projected at mean velocity." />
      <div style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 10, padding: "20px 16px", marginBottom: 24 }}>
        {velocityChartData.length === 0
          ? <div style={{ textAlign: "center", padding: 40, color: "#7a8a99", fontSize: 13 }}>No sprint data — upload a Stories CSV via <strong>/admin</strong>.</div>
          : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={velocityChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a6ca8" stopOpacity={0.18} /><stop offset="95%" stopColor="#1a6ca8" stopOpacity={0} /></linearGradient>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7fb3d3" stopOpacity={0.12} /><stop offset="95%" stopColor="#7fb3d3" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#7a8a99" }} />
                <YAxis tick={{ fontSize: 10, fill: "#7a8a99" }} domain={[0, "auto"]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #dce3ea" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={vStats.mean} stroke="#1a6ca8" strokeDasharray="4 4" label={{ value: `Avg ${vStats.mean}`, fontSize: 10, fill: "#1a6ca8", position: "right" }} />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="#1a6ca8" strokeWidth={2} fill="url(#ag)" dot={{ r: 4, fill: "#1a6ca8" }} connectNulls={false} />
                <Area type="monotone" dataKey="projected" name="Projected" stroke="#7fb3d3" strokeWidth={2} strokeDasharray="5 4" fill="url(#pg)" dot={{ r: 3, fill: "#7fb3d3" }} connectNulls={false} />
                <Area type="monotone" dataKey="planned" name="Planned" stroke="#d68910" strokeWidth={1.5} strokeDasharray="2 3" fill="none" dot={false} />
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
  );
}

function FeatureSlipTab({ scoredFeatures, features, blockedCount, sortBy, setSortBy }: { scoredFeatures: ScoredFeature[]; features: TransformedFeature[]; blockedCount: number; sortBy: SortMode; setSortBy: (s: SortMode) => void }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <StatPill label="Will Slip" value={scoredFeatures.filter(f => f.slip.label === "Will Slip").length} color="#c0392b" />
        <StatPill label="At Risk" value={scoredFeatures.filter(f => f.slip.label === "At Risk").length} color="#d68910" />
        <StatPill label="Blocked" value={blockedCount} color="#c0392b" />
        <StatPill label="On Track" value={scoredFeatures.filter(f => f.slip.label === "On Track").length} color="#1e8449" />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#7a8a99" }}>Sort:</span>
          {([["slip", "Slip Score"], ["date", "Due Date"], ["pct", "% Done"]] as const).map(([val, lbl]) => (
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
              <FeatureSlipCard key={f.key} feature={f} />
            ))}
          </div>
        )}
    </div>
  );
}

function FeatureSlipCard({ feature: f }: { feature: ScoredFeature }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 10, overflow: "hidden", borderLeft: `4px solid ${f.slip.color}` }}>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ background: (TEAM_COLORS[f.team] || "#566573") + "18", color: TEAM_COLORS[f.team] || "#566573", border: `1px solid ${(TEAM_COLORS[f.team] || "#566573")}30`, borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{f.team}</span>
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
            { label: "Actual % Done", pct: Math.round(f.pctComplete), color: "#1a6ca8" },
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
  );
}
