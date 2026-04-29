"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { API_BASE } from "@/lib/api";

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

const PI_BANDS = [
  { name: "PI 26.1", start: "2026-01-01", end: "2026-03-11" },
  { name: "PI 26.2", start: "2026-03-12", end: "2026-05-20" },
  { name: "PI 26.3", start: "2026-05-21", end: "2026-07-29" },
  { name: "PI 26.4", start: "2026-07-30", end: "2026-10-07" },
  { name: "PI 26.5", start: "2026-10-08", end: "2026-12-16" },
];

const TIMELINE_START = new Date("2026-01-01");
const TIMELINE_END   = new Date("2026-12-31");
const TIMELINE_DAYS  = (TIMELINE_END.getTime() - TIMELINE_START.getTime()) / 86400000;
const TODAY          = new Date();

const STATUS_CFG: Record<string, { bar: string; bg: string; border: string; text: string }> = {
  Implementing:    { bar: "#0052cc", bg: "#dbeafe", border: "#93c5fd", text: "#1e3a8a" },
  Analyzing:       { bar: "#b45309", bg: "#fef3c7", border: "#fcd34d", text: "#78350f" },
  Funnel:          { bar: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", text: "#374151" },
  "Ready Backlog": { bar: "#059669", bg: "#d1fae5", border: "#6ee7b7", text: "#064e3b" },
  Done:            { bar: "#059669", bg: "#d1fae5", border: "#6ee7b7", text: "#064e3b" },
  "To Do":         { bar: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", text: "#374151" },
  Unknown:         { bar: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280" },
};

const fallbackCfg = STATUS_CFG["Unknown"];

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState {
  feature: RoadmapFeature;
  x: number;
  y: number;
}

function Tooltip({ tip }: { tip: TooltipState }) {
  const { feature } = tip;
  const cfg    = STATUS_CFG[feature.status] ?? fallbackCfg;
  const atRisk = isAtRisk(feature);

  const daysLeft = feature.target_end_date
    ? Math.round((new Date(feature.target_end_date).getTime() - TODAY.getTime()) / 86400000)
    : null;

  const assigneeShort = feature.assignee
    ? feature.assignee.split(",")[0].trim()
    : "Unassigned";

  // Position: prefer right of cursor, flip left if near right edge
  const TOOLTIP_W = 260;
  const left = tip.x + 16 + TOOLTIP_W > window.innerWidth
    ? tip.x - TOOLTIP_W - 8
    : tip.x + 16;
  const top = tip.y - 8;

  return (
    <div style={{
      position: "fixed",
      left,
      top,
      width: TOOLTIP_W,
      background: "var(--bg-panel)",
      border: `1px solid ${atRisk ? "#fca5a5" : "var(--border-strong)"}`,
      borderRadius: 6,
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      zIndex: 1000,
      pointerEvents: "none",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px",
        borderBottom: "1px solid var(--border)",
        background: atRisk ? "#fff5f5" : "var(--bg-card)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
            color: "var(--accent)", letterSpacing: "0.06em",
          }}>{feature.issue_key}</span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700,
            padding: "1px 5px", borderRadius: 2,
            background: atRisk ? "#fee2e2" : cfg.bg,
            color: atRisk ? "#b91c1c" : cfg.text,
            border: `1px solid ${atRisk ? "#fca5a5" : cfg.border}`,
          }}>{atRisk ? "AT RISK" : feature.status}</span>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4,
        }}>
          {shortSummary(feature.summary)}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px" }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em" }}>PROGRESS</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: atRisk ? "#b91c1c" : cfg.bar }}>
              {Math.round(feature.pct_complete)}%
            </span>
          </div>
          <div style={{ height: 5, background: "var(--track-bg)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.min(100, feature.pct_complete)}%`,
              background: atRisk ? "#ef4444" : cfg.bar, borderRadius: 3,
            }} />
          </div>
        </div>

        {/* Story breakdown */}
        {feature.story_total > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {[
              { label: "Done",        value: feature.story_done,        color: "#059669" },
              { label: "In Progress", value: feature.story_in_progress, color: "#0052cc" },
              { label: "To Do",       value: feature.story_todo,        color: "var(--text-muted)" },
            ].map(s => (
              <div key={s.label} style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 3, padding: "5px 6px", textAlign: "center",
              }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.04em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Date / assignee rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            { label: "Start",    value: fmtDate(feature.target_start_date) },
            { label: "End",      value: fmtDate(feature.target_end_date) },
            { label: "Due",      value: fmtDate(feature.due_date) },
            { label: "Assignee", value: assigneeShort },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em" }}>{r.label.toUpperCase()}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-primary)", fontWeight: 600 }}>{r.value}</span>
            </div>
          ))}
          {daysLeft !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em" }}>DAYS LEFT</span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                color: daysLeft < 0 ? "#b91c1c" : daysLeft < 14 ? "#b45309" : "#059669",
              }}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)} overdue` : `${daysLeft} days`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function toPct(dateStr: string): string {
  const d = new Date(dateStr);
  const days = Math.max(0, (d.getTime() - TIMELINE_START.getTime()) / 86400000);
  return `${Math.min(100, (days / TIMELINE_DAYS) * 100).toFixed(4)}%`;
}

function widthPct(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const days = Math.max(0, (e - s) / 86400000);
  return `${Math.min(100, (days / TIMELINE_DAYS) * 100).toFixed(4)}%`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isAtRisk(f: RoadmapFeature): boolean {
  if (!f.target_end_date) return false;
  const end = new Date(f.target_end_date);
  if (end < TODAY && f.pct_complete < 100) return true;
  const daysLeft = (end.getTime() - TODAY.getTime()) / 86400000;
  if (daysLeft < 14 && f.pct_complete < 80) return true;
  return false;
}

function shortSummary(summary: string): string {
  return summary.replace(/^P-\d+: Cigna Commercial Migration \(ISAAC to IO\) - /, "");
}

function PIHeaderRow() {
  return (
    <div style={{ position: "relative", height: 36, borderBottom: "2px solid #b0bfcc" }}>
      {PI_BANDS.map((pi, i) => {
        const left = toPct(pi.start);
        const width = widthPct(pi.start, pi.end);
        const isEven = i % 2 === 0;
        return (
          <div key={pi.name} style={{
            position: "absolute", left, width, top: 0, bottom: 0,
            background: isEven ? "#dbeafe" : "#eff6ff",
            borderRight: "1px solid #93c5fd",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.08em", color: "#1e40af", textTransform: "uppercase",
            }}>{pi.name}</span>
          </div>
        );
      })}
      <div style={{
        position: "absolute", left: toPct(TODAY.toISOString().slice(0, 10)),
        top: 0, bottom: 0, width: 2, background: "#dc2626", zIndex: 10,
      }} />
    </div>
  );
}

function PIBands() {
  return (
    <>
      {PI_BANDS.map((pi, i) => (
        <div key={pi.name} style={{
          position: "absolute", left: toPct(pi.start), width: widthPct(pi.start, pi.end),
          top: 0, bottom: 0,
          background: i % 2 === 0 ? "rgba(219,234,254,0.25)" : "rgba(239,246,255,0.15)",
          borderRight: "1px solid #dbeafe", pointerEvents: "none",
        }} />
      ))}
    </>
  );
}

function TodayLine() {
  return (
    <div style={{
      position: "absolute", left: toPct(TODAY.toISOString().slice(0, 10)),
      top: 0, bottom: 0, width: 2, background: "#dc2626", zIndex: 10, pointerEvents: "none",
    }}>
      <div style={{
        position: "absolute", top: 4, left: 4,
        fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
        color: "#dc2626", whiteSpace: "nowrap", letterSpacing: "0.08em",
      }}>TODAY</div>
    </div>
  );
}

function FeatureBar({ feature }: { feature: RoadmapFeature }) {
  const cfg = STATUS_CFG[feature.status] ?? fallbackCfg;
  const atRisk = isAtRisk(feature);

  if (!feature.target_start_date || !feature.target_end_date) {
    return (
      <div style={{ height: 28, display: "flex", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", fontStyle: "italic", paddingLeft: 8 }}>
          no dates planned
        </span>
      </div>
    );
  }

  const left = toPct(feature.target_start_date);
  const width = widthPct(feature.target_start_date, feature.target_end_date);
  const progressW = `${Math.min(100, feature.pct_complete).toFixed(1)}%`;
  const showLabel = feature.pct_complete >= 15;

  return (
    <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
      <div style={{
        position: "absolute", left, width, height: 22,
        background: atRisk ? "#fee2e2" : cfg.bg,
        border: `1px solid ${atRisk ? "#fca5a5" : cfg.border}`,
        borderRadius: 3, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: progressW,
          background: atRisk ? "#ef4444" : cfg.bar,
          borderRadius: "3px 0 0 3px", transition: "width 0.4s ease",
        }} />
        {showLabel && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 6,
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
            color: feature.pct_complete > 45 ? "#fff" : (atRisk ? "#b91c1c" : cfg.text),
            zIndex: 1, letterSpacing: "0.04em",
          }}>
            {Math.round(feature.pct_complete)}%
          </div>
        )}
      </div>
      {feature.due_date && (
        <div style={{
          position: "absolute", left: toPct(feature.due_date),
          top: 2, width: 3, height: 24, background: "#dc2626", borderRadius: 1, zIndex: 5,
        }} />
      )}
      {atRisk && (
        <div style={{
          position: "absolute", left: `calc(${left} - 14px)`,
          top: "50%", transform: "translateY(-50%)",
          fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: 13,
          color: "#ef4444", zIndex: 6,
        }}>!</div>
      )}
    </div>
  );
}

const LABEL_W = 300;
const ROW_H   = 56;

function FeatureRow({ feature, isLast, onHover, onLeave }: {
  feature: RoadmapFeature;
  isLast: boolean;
  onHover: (f: RoadmapFeature, e: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const cfg    = STATUS_CFG[feature.status] ?? fallbackCfg;
  const atRisk = isAtRisk(feature);

  return (
    <div
      onMouseEnter={e => onHover(feature, e)}
      onMouseMove={e => onHover(feature, e)}
      onMouseLeave={onLeave}
      style={{
        display: "flex", height: ROW_H,
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        background: atRisk ? "rgba(239,68,68,0.03)" : "transparent",
        alignItems: "center",
        cursor: "default",
      }}
    >
      <div style={{
        width: LABEL_W, flexShrink: 0, padding: "0 14px",
        borderRight: "1px solid var(--border)", height: "100%",
        display: "flex", flexDirection: "column", justifyContent: "center", gap: 3,
        borderLeft: atRisk ? "3px solid #ef4444" : "3px solid transparent",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
            color: "var(--accent)", flexShrink: 0, letterSpacing: "0.05em",
          }}>{feature.issue_key}</span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700,
            padding: "1px 5px", borderRadius: 2,
            background: atRisk ? "#fee2e2" : cfg.bg,
            color: atRisk ? "#b91c1c" : cfg.text,
            border: `1px solid ${atRisk ? "#fca5a5" : cfg.border}`,
            flexShrink: 0, letterSpacing: "0.04em",
          }}>{atRisk ? "AT RISK" : feature.status.toUpperCase()}</span>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }} title={feature.summary}>
          {shortSummary(feature.summary)}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {feature.story_total > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
              {feature.story_done}/{feature.story_total} stories
            </span>
          )}
          {feature.target_end_date && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
              ends {fmtDate(feature.target_end_date)}
            </span>
          )}
        </div>
      </div>
      <div style={{
        flex: 1, position: "relative", height: "100%",
        display: "flex", alignItems: "center", padding: "0 6px", overflow: "hidden",
      }}>
        <PIBands />
        <TodayLine />
        <div style={{ position: "relative", width: "100%", zIndex: 2 }}>
          <FeatureBar feature={feature} />
        </div>
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const [features, setFeatures] = useState<RoadmapFeature[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState("all");
  const [tooltip, setTooltip]   = useState<TooltipState | null>(null);

  const handleHover = useCallback((f: RoadmapFeature, e: React.MouseEvent) => {
    setTooltip({ feature: f, x: e.clientX, y: e.clientY });
  }, []);
  const handleLeave = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    fetch(`${API_BASE}/api/roadmap`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { setFeatures(data); setLoading(false); })
      .catch(() => { setError("Could not load roadmap — make sure the backend is running."); setLoading(false); });
  }, []);

  const statuses    = ["all", ...Array.from(new Set(features.map(f => f.status))).sort()];
  const atRiskCount = features.filter(isAtRisk).length;
  const withDates   = features.filter(f => f.target_start_date && f.target_end_date);

  const visible = filter === "at-risk"
    ? features.filter(isAtRisk)
    : filter === "all"
    ? features
    : features.filter(f => f.status === filter);

  if (loading) return <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, padding: 32 }}>Loading roadmap…</div>;
  if (error)   return <div style={{ color: "var(--status-critical)", fontFamily: "var(--font-mono)", fontSize: 12, padding: 32 }}>{error}</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 4 }}>Planning</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "0.04em", color: "var(--text-primary)", marginBottom: 6 }}>ROADMAP</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          Planned delivery windows from Jira Advanced Roadmaps, overlaid with actual story progress.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Features",  value: features.length,  color: undefined },
          { label: "With Dates",      value: withDates.length, color: undefined },
          { label: "At Risk",         value: atRiskCount,      color: atRiskCount > 0 ? "var(--status-critical)" : undefined },
          { label: "Implementing",    value: features.filter(f => f.status === "Implementing").length, color: "var(--accent)" },
        ].map(s => (
          <div key={s.label} className="panel" style={{ padding: "12px 16px" }}>
            <div className="label" style={{ marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: s.color ?? "var(--text-primary)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setFilter(filter === "at-risk" ? "all" : "at-risk")} style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 3,
            border: `1px solid ${filter === "at-risk" ? "#ef4444" : "var(--border)"}`,
            background: filter === "at-risk" ? "#fee2e2" : "var(--bg-panel)",
            color: filter === "at-risk" ? "#b91c1c" : "var(--text-secondary)", cursor: "pointer", letterSpacing: "0.06em",
          }}>! AT RISK ({atRiskCount})</button>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 3,
              border: `1px solid ${filter === s ? "var(--accent)" : "var(--border)"}`,
              background: filter === s ? "var(--accent-light)" : "var(--bg-panel)",
              color: filter === s ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer",
              textTransform: "capitalize", letterSpacing: "0.04em",
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {[
            { color: "#0052cc", label: "Progress" },
            { color: "#ef4444", label: "At risk" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 12, height: 10, background: l.color, borderRadius: 2 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>{l.label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 2, height: 14, background: "#dc2626" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#dc2626", fontWeight: 700 }}>Due / Today</span>
          </div>
        </div>
      </div>

      <div className="panel" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <div style={{ width: LABEL_W, flexShrink: 0, padding: "8px 14px", borderRight: "1px solid var(--border)" }}>
            <span className="label">Feature</span>
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <PIHeaderRow />
          </div>
        </div>
        {visible.map((feature, i) => (
          <FeatureRow key={feature.issue_key} feature={feature} isLast={i === visible.length - 1} onHover={handleHover} onLeave={handleLeave} />
        ))}
        {visible.length === 0 && (
          <div style={{ padding: "32px 0", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            No features match this filter.
          </div>
        )}
      </div>
      {tooltip && <Tooltip tip={tooltip} />}
    </div>
  );
}
