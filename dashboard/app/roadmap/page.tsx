"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

// ── types ─────────────────────────────────────────────────────────────────────

interface RoadmapFeature {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  priority: string | null;
  assignee: string | null;
  target_start_date: string | null;
  target_end_date: string | null;
  due_date: string | null;
  story_total: number;
  story_done: number;
  story_in_progress: number;
  story_todo: number;
  pct_complete: number;
}

// ── constants ─────────────────────────────────────────────────────────────────

// PI date boundaries for the timeline
const PI_BANDS = [
  { name: "PI 26.1", start: "2026-01-01", end: "2026-03-11", color: "#e8f0fb" },
  { name: "PI 26.2", start: "2026-03-12", end: "2026-05-20", color: "#f0f7ff" },
  { name: "PI 26.3", start: "2026-05-21", end: "2026-07-29", color: "#e8f0fb" },
  { name: "PI 26.4", start: "2026-07-30", end: "2026-10-07", color: "#f0f7ff" },
  { name: "PI 26.5", start: "2026-10-08", end: "2026-12-16", color: "#e8f0fb" },
];

const TIMELINE_START = new Date("2026-01-01");
const TIMELINE_END = new Date("2026-12-31");
const TIMELINE_DAYS = (TIMELINE_END.getTime() - TIMELINE_START.getTime()) / 86400000;

const STATUS_COLORS: Record<string, { bar: string; text: string; bg: string; border: string }> = {
  Implementing: { bar: "#0052cc", text: "#003a8c", bg: "#e8f0fb", border: "#b3d1f7" },
  Analyzing:    { bar: "#a05c00", text: "#7a4500", bg: "#fff3e0", border: "#ffd699" },
  Funnel:       { bar: "#6b7280", text: "#4a5568", bg: "#f3f4f6", border: "#d1d5db" },
  "Ready Backlog": { bar: "#1a7f4b", text: "#145c35", bg: "#e6f5ec", border: "#b3dfc3" },
  Done:         { bar: "#1a7f4b", text: "#145c35", bg: "#e6f5ec", border: "#b3dfc3" },
};

const TODAY = new Date();

// ── helpers ───────────────────────────────────────────────────────────────────

function dayOffset(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.max(0, (d.getTime() - TIMELINE_START.getTime()) / 86400000);
}

function pct(days: number): string {
  return `${Math.min(100, (days / TIMELINE_DAYS) * 100).toFixed(3)}%`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortKey(key: string): string {
  return key;
}

// ── sub-components ────────────────────────────────────────────────────────────

function TodayLine() {
  const offset = pct(dayOffset(TODAY.toISOString().slice(0, 10)));
  return (
    <div style={{
      position: "absolute",
      left: offset,
      top: 0,
      bottom: 0,
      width: 1,
      background: "#c0392b",
      zIndex: 10,
      pointerEvents: "none",
    }}>
      <div style={{
        position: "absolute",
        top: -18,
        left: -16,
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        color: "#c0392b",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}>TODAY</div>
    </div>
  );
}

function PIBands() {
  return (
    <>
      {PI_BANDS.map((pi) => {
        const left = pct(dayOffset(pi.start));
        const width = pct(dayOffset(pi.end) - dayOffset(pi.start));
        return (
          <div key={pi.name} style={{
            position: "absolute",
            left,
            width,
            top: 0,
            bottom: 0,
            background: pi.color,
            borderRight: "1px solid #d0dae6",
          }}>
            <div style={{
              position: "absolute",
              top: 4,
              left: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 700,
              color: "#8fa4b8",
              letterSpacing: "0.06em",
            }}>{pi.name}</div>
          </div>
        );
      })}
    </>
  );
}

function FeatureBar({ feature }: { feature: RoadmapFeature }) {
  const cfg = STATUS_COLORS[feature.status] ?? STATUS_COLORS["Funnel"];
  const hasBar = feature.target_start_date && feature.target_end_date;

  if (!hasBar) {
    return (
      <div style={{
        height: 20,
        display: "flex",
        alignItems: "center",
        paddingLeft: 8,
      }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--text-muted)",
          fontStyle: "italic",
        }}>no dates planned</span>
      </div>
    );
  }

  const startPct = pct(dayOffset(feature.target_start_date!));
  const widthPct = pct(dayOffset(feature.target_end_date!) - dayOffset(feature.target_start_date!));
  const progressWidth = `${feature.pct_complete}%`;
  const hasDue = !!feature.due_date;
  const duePct = hasDue ? pct(dayOffset(feature.due_date!)) : null;

  return (
    <div style={{ position: "relative", height: 24 }}>
      {/* Planned bar */}
      <div style={{
        position: "absolute",
        left: startPct,
        width: widthPct,
        top: 4,
        height: 16,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 3,
        overflow: "hidden",
      }}>
        {/* Actual progress fill */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: progressWidth,
          background: cfg.bar,
          opacity: 0.85,
        }} />
        {/* Label */}
        {feature.pct_complete > 0 && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            paddingLeft: 5,
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            fontWeight: 700,
            color: feature.pct_complete > 40 ? "#fff" : cfg.text,
            zIndex: 1,
          }}>
            {Math.round(feature.pct_complete)}%
          </div>
        )}
      </div>
      {/* Due date marker */}
      {duePct && (
        <div style={{
          position: "absolute",
          left: duePct,
          top: 2,
          width: 2,
          height: 20,
          background: "#c0392b",
          borderRadius: 1,
        }} />
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const [features, setFeatures] = useState<RoadmapFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`${API_BASE}/api/roadmap`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { setFeatures(data); setLoading(false); })
      .catch(() => { setError("Could not load roadmap — make sure the backend is running."); setLoading(false); });
  }, []);

  const statuses = ["all", ...Array.from(new Set(features.map((f) => f.status))).sort()];
  const visible = filter === "all" ? features : features.filter((f) => f.status === filter);
  const withDates = visible.filter((f) => f.target_start_date && f.target_end_date);
  const withoutDates = visible.filter((f) => !f.target_start_date || !f.target_end_date);

  if (loading) return (
    <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, padding: 32 }}>
      Loading roadmap…
    </div>
  );
  if (error) return (
    <div style={{ color: "var(--status-critical)", fontFamily: "var(--font-mono)", fontSize: 12, padding: 32 }}>
      {error}
    </div>
  );

  const ROW_HEIGHT = 44;
  const LABEL_WIDTH = 280;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 4 }}>Planning</div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: "0.04em",
          color: "var(--text-primary)",
          marginBottom: 8,
        }}>ROADMAP</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          Planned delivery windows from Jira Advanced Roadmaps, overlaid with actual story progress.
          <span style={{ marginLeft: 12, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
            {features.length} features · {withDates.length} with planned dates
          </span>
        </p>
      </div>

      {/* Legend + filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {[
            { color: "#0052cc", label: "Actual progress" },
            { color: "#c0392b", label: "Due date" },
            { color: "#c0392b", label: "Today", dashed: true },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: l.dashed ? 1 : 12,
                height: l.dashed ? 14 : 10,
                background: l.color,
                borderRadius: l.dashed ? 0 : 2,
                borderLeft: l.dashed ? `1px dashed ${l.color}` : undefined,
              }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>{l.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                padding: "4px 10px",
                borderRadius: 3,
                border: `1px solid ${filter === s ? "var(--accent)" : "var(--border)"}`,
                background: filter === s ? "var(--accent-light)" : "var(--bg-panel)",
                color: filter === s ? "var(--accent)" : "var(--text-secondary)",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="panel" style={{ overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <div style={{ width: LABEL_WIDTH, flexShrink: 0, padding: "8px 12px", borderRight: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Feature
            </span>
          </div>
          <div style={{ flex: 1, position: "relative", height: 28, overflow: "hidden" }}>
            <PIBands />
          </div>
        </div>

        {/* Feature rows */}
        {[...withDates, ...withoutDates].map((feature, i) => {
          const cfg = STATUS_COLORS[feature.status] ?? STATUS_COLORS["Funnel"];
          const isLast = i === visible.length - 1;
          return (
            <div
              key={feature.issue_key}
              style={{
                display: "flex",
                borderBottom: isLast ? "none" : "1px solid var(--border)",
                height: ROW_HEIGHT,
                alignItems: "center",
              }}
            >
              {/* Label column */}
              <div style={{
                width: LABEL_WIDTH,
                flexShrink: 0,
                padding: "0 12px",
                borderRight: "1px solid var(--border)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 2,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--accent)",
                    flexShrink: 0,
                  }}>{shortKey(feature.issue_key)}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }} title={feature.summary}>
                    {feature.summary.replace(/^P-031440: Cigna Commercial Migration \(ISAAC to IO\) - /, "")}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 2,
                    background: cfg.bg,
                    color: cfg.text,
                    border: `1px solid ${cfg.border}`,
                    flexShrink: 0,
                  }}>{feature.status}</span>
                  {feature.story_total > 0 && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
                      {feature.story_done}/{feature.story_total} stories
                    </span>
                  )}
                  {feature.due_date && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", marginLeft: "auto" }}>
                      due {fmtDate(feature.due_date)}
                    </span>
                  )}
                </div>
              </div>

              {/* Timeline column */}
              <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center", padding: "0 4px" }}>
                <PIBands />
                <TodayLine />
                <div style={{ position: "relative", width: "100%", zIndex: 2 }}>
                  <FeatureBar feature={feature} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "Total Features", value: features.length },
          { label: "Implementing", value: features.filter(f => f.status === "Implementing").length },
          { label: "Analyzing", value: features.filter(f => f.status === "Analyzing").length },
          { label: "Funnel / Backlog", value: features.filter(f => ["Funnel","Ready Backlog"].includes(f.status)).length },
        ].map((s) => (
          <div key={s.label} className="panel" style={{ padding: "12px 14px" }}>
            <div className="label" style={{ marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
