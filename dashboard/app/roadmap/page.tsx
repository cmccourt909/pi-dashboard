"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Story {
  key: string;
  summary: string;
  status: string;
  sprint?: string;
}

interface Feature {
  key: string;
  summary: string;
  status: string;
  progress: number;
  planned_start?: string;
  planned_end?: string;
  assignee?: string;
  stories: Story[];
  sprints?: string[];
}

interface RoadmapData {
  features: Feature[];
  pis: { name: string; start: string; end: string }[];
  sprints: { name: string; start: string; end: string; pi: string }[];
}

type SortKey = "default" | "progress_asc" | "progress_desc" | "due_asc" | "due_desc" | "at_risk";
type ViewMode = "feature" | "assignee" | "sprint";
type GranularityMode = "pi" | "sprint";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseDate = (s?: string) => (s ? new Date(s) : null);
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

function isAtRisk(f: Feature): boolean {
  const end = parseDate(f.planned_end);
  if (!end) return false;
  const now = new Date();
  const daysLeft = (end.getTime() - now.getTime()) / 86400000;
  if (end < now && f.progress < 100) return true;
  if (daysLeft <= 14 && f.progress < 80) return true;
  return false;
}

function isOverdue(f: Feature): boolean {
  const end = parseDate(f.planned_end);
  return !!end && end < new Date() && f.progress < 100;
}

function daysRemaining(f: Feature): number {
  const end = parseDate(f.planned_end);
  if (!end) return 0;
  return Math.ceil((end.getTime() - new Date().getTime()) / 86400000);
}

function healthColor(f: Feature): string {
  if (isOverdue(f)) return "var(--red)";
  if (isAtRisk(f)) return "var(--amber)";
  if (f.progress === 100) return "var(--green)";
  return "var(--blue)";
}

// Strip repetitive Jira prefix from feature summaries
const COMMON_PREFIX = /^P-\d+:\s*Cigna Commercial Migration \(ISAAC to IO\)\s*[-–]\s*/i;
function cleanSummary(summary: string): string {
  return summary.replace(COMMON_PREFIX, "").trim();
}

function sortFeatures(features: Feature[], sort: SortKey): Feature[] {
  const arr = [...features];
  switch (sort) {
    case "progress_asc": return arr.sort((a, b) => a.progress - b.progress);
    case "progress_desc": return arr.sort((a, b) => b.progress - a.progress);
    case "due_asc": return arr.sort((a, b) => {
      const da = parseDate(a.planned_end)?.getTime() ?? Infinity;
      const db = parseDate(b.planned_end)?.getTime() ?? Infinity;
      return da - db;
    });
    case "due_desc": return arr.sort((a, b) => {
      const da = parseDate(a.planned_end)?.getTime() ?? 0;
      const db = parseDate(b.planned_end)?.getTime() ?? 0;
      return db - da;
    });
    case "at_risk": return arr.sort((a, b) => {
      const ra = isOverdue(a) ? 2 : isAtRisk(a) ? 1 : 0;
      const rb = isOverdue(b) ? 2 : isAtRisk(b) ? 1 : 0;
      return rb - ra;
    });
    default: return arr;
  }
}

// ─── Mock Data (replace with real API call) ───────────────────────────────────

function mockData(): RoadmapData {
  const today = new Date();
  const d = (offset: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };

  return {
    pis: [
      { name: "PI 26.2", start: d(-90), end: d(-1) },
      { name: "PI 26.3", start: d(0), end: d(89) },
    ],
    sprints: [
      { name: "26.2 S1", start: d(-90), end: d(-76), pi: "PI 26.2" },
      { name: "26.2 S2", start: d(-75), end: d(-61), pi: "PI 26.2" },
      { name: "26.2 S3", start: d(-60), end: d(-46), pi: "PI 26.2" },
      { name: "26.2 S4", start: d(-45), end: d(-31), pi: "PI 26.2" },
      { name: "26.2 S5", start: d(-30), end: d(-16), pi: "PI 26.2" },
      { name: "26.2 S6", start: d(-15), end: d(-1), pi: "PI 26.2" },
      { name: "26.3 S1", start: d(0), end: d(13), pi: "PI 26.3" },
      { name: "26.3 S2", start: d(14), end: d(27), pi: "PI 26.3" },
      { name: "26.3 S3", start: d(28), end: d(41), pi: "PI 26.3" },
      { name: "26.3 S4", start: d(42), end: d(55), pi: "PI 26.3" },
      { name: "26.3 S5", start: d(56), end: d(69), pi: "PI 26.3" },
      { name: "26.3 S6", start: d(70), end: d(89), pi: "PI 26.3" },
    ],
    features: [
      { key: "EVLGCN-101", summary: "ISAAC Policy Migration — Core Engine", status: "In Progress", progress: 85, planned_start: d(-60), planned_end: d(10), assignee: "Sarah M.", sprints: ["26.2 S4", "26.2 S5", "26.2 S6", "26.3 S1"], stories: [{ key: "S-001", summary: "Migrate policy rules", status: "Done", sprint: "26.2 S4" }, { key: "S-002", summary: "Validation layer", status: "In Progress", sprint: "26.3 S1" }] },
      { key: "EVLGCN-102", summary: "Image One API Integration", status: "In Progress", progress: 62, planned_start: d(-45), planned_end: d(20), assignee: "James T.", sprints: ["26.2 S5", "26.2 S6", "26.3 S1", "26.3 S2"], stories: [{ key: "S-003", summary: "Auth handshake", status: "Done", sprint: "26.2 S5" }, { key: "S-004", summary: "Endpoint mapping", status: "In Progress", sprint: "26.3 S1" }] },
      { key: "EVLGCN-103", summary: "Claims Processing Reroute", status: "At Risk", progress: 30, planned_start: d(-20), planned_end: d(8), assignee: "Sarah M.", sprints: ["26.2 S6", "26.3 S1"], stories: [{ key: "S-005", summary: "Claims queue adapter", status: "In Progress", sprint: "26.2 S6" }] },
      { key: "EVLGCN-104", summary: "Member Data Sync", status: "On Track", progress: 95, planned_start: d(-80), planned_end: d(-5), assignee: "Priya K.", sprints: ["26.2 S1", "26.2 S2", "26.2 S3"], stories: [{ key: "S-006", summary: "Delta sync", status: "Done", sprint: "26.2 S2" }] },
      { key: "EVLGCN-105", summary: "Provider Directory Migration", status: "On Track", progress: 50, planned_start: d(5), planned_end: d(50), assignee: "James T.", sprints: ["26.3 S1", "26.3 S2", "26.3 S3", "26.3 S4"], stories: [{ key: "S-007", summary: "Directory schema", status: "To Do", sprint: "26.3 S2" }] },
      { key: "EVLGCN-106", summary: "Eligibility Engine Cutover", status: "Blocked", progress: 10, planned_start: d(0), planned_end: d(30), assignee: "Wei L.", sprints: ["26.3 S1", "26.3 S2"], stories: [{ key: "S-008", summary: "Eligibility rules", status: "Blocked", sprint: "26.3 S1" }] },
      { key: "EVLGCN-107", summary: "Reporting & Audit Trail", status: "On Track", progress: 100, planned_start: d(-90), planned_end: d(-30), assignee: "Priya K.", sprints: ["26.2 S1", "26.2 S2"], stories: [{ key: "S-009", summary: "Audit schema", status: "Done", sprint: "26.2 S1" }] },
      { key: "EVLGCN-108", summary: "Notification Service Migration", status: "In Progress", progress: 45, planned_start: d(15), planned_end: d(60), assignee: "Wei L.", sprints: ["26.3 S2", "26.3 S3", "26.3 S4"], stories: [{ key: "S-010", summary: "Email templates", status: "To Do", sprint: "26.3 S2" }] },
    ],
  };
}

// ─── Gantt Bar ────────────────────────────────────────────────────────────────

function GanttBar({ feature, timelineStart, timelineDuration, granularity, sprints }: {
  feature: Feature;
  timelineStart: Date;
  timelineDuration: number;
  granularity: GranularityMode;
  sprints: RoadmapData["sprints"];
}) {
  const [tooltip, setTooltip] = useState(false);
  const start = parseDate(feature.planned_start);
  const end = parseDate(feature.planned_end);
  if (!start || !end) {
    return (
      <div className="gantt-bar-row">
        <span className="no-dates">No dates planned</span>
      </div>
    );
  }

  const left = Math.max(0, (start.getTime() - timelineStart.getTime()) / (timelineDuration * 86400000)) * 100;
  const width = Math.max(1, (end.getTime() - start.getTime()) / (timelineDuration * 86400000)) * 100;
  const color = healthColor(feature);
  const days = daysRemaining(feature);

  // Sprint markers within bar
  const sprintMarkers = granularity === "sprint"
    ? (feature.sprints || []).map(sprintName => {
        const s = sprints.find(sp => sp.name === sprintName);
        if (!s) return null;
        const sStart = new Date(s.start);
        const sEnd = new Date(s.end);
        const markerLeft = Math.max(0, (sStart.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
        const markerWidth = Math.min(100 - markerLeft, (sEnd.getTime() - sStart.getTime()) / (end.getTime() - start.getTime()) * 100);
        return { name: sprintName, left: markerLeft, width: markerWidth };
      }).filter(Boolean)
    : [];

  return (
    <div className="gantt-bar-row" onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
      <div className="gantt-bar-track">
        <div
          className={`gantt-bar ${isOverdue(feature) ? "overdue" : isAtRisk(feature) ? "at-risk" : ""}`}
          style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, borderColor: color }}
        >
          {/* Progress fill */}
          <div className="gantt-progress" style={{ width: `${feature.progress}%`, background: color }} />

          {/* Sprint segment markers */}
          {sprintMarkers.map((m: any) => (
            <div key={m.name} className="sprint-marker" style={{ left: `${m.left}%`, width: `${m.width}%` }} title={m.name} />
          ))}

          {/* Label */}
          <span className="gantt-bar-label">{feature.progress}%</span>

          {/* At-risk badge */}
          {(isAtRisk(feature) || isOverdue(feature)) && (
            <span className="risk-badge">!</span>
          )}
        </div>

        {/* Today line is rendered at the track level in the parent */}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="gantt-tooltip">
          <div className="tt-header">
            <span className="tt-key">{feature.key}</span>
            <span className="tt-status" style={{ color }}>{isOverdue(feature) ? "Overdue" : isAtRisk(feature) ? "At Risk" : feature.status}</span>
          </div>
          <div className="tt-summary">{cleanSummary(feature.summary)}</div>
          <div className="tt-meta">
            <span>👤 {feature.assignee || "Unassigned"}</span>
            <span>{fmt(start)} → {fmt(end)}</span>
            <span>{days >= 0 ? `${days}d remaining` : `${Math.abs(days)}d overdue`}</span>
          </div>
          <div className="tt-progress-row">
            <div className="tt-progress-track">
              <div className="tt-progress-fill" style={{ width: `${feature.progress}%`, background: color }} />
            </div>
            <span>{feature.progress}%</span>
          </div>
          <div className="tt-stories">
            {feature.stories.slice(0, 4).map(s => (
              <div key={s.key} className="tt-story">
                <span className={`tt-dot ${s.status === "Done" ? "done" : s.status === "Blocked" ? "blocked" : "active"}`} />
                <span className="tt-story-key">{s.key}</span>
                <span className="tt-story-sum">{s.summary}</span>
                {s.sprint && <span className="tt-story-sprint">{s.sprint}</span>}
              </div>
            ))}
            {feature.stories.length > 4 && <div className="tt-more">+{feature.stories.length - 4} more stories</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [sort, setSort] = useState<SortKey>("default");
  const [view, setView] = useState<ViewMode>("feature");
  const [granularity, setGranularity] = useState<GranularityMode>("pi");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const ganttRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/roadmap")
      .then(r => r.json())
      .then((raw: any) => {
        const featureList: any[] = raw.features ?? [];
        const features: Feature[] = featureList.map((f: any) => ({
          key: f.issue_key ?? f.key,
          summary: f.summary,
          status: f.status ?? "Unknown",
          progress: f.pct_complete ?? f.progress ?? 0,
          planned_start: f.target_start_date ?? f.planned_start,
          planned_end: f.target_end_date ?? f.planned_end,
          assignee: f.assignee ?? undefined,
          sprints: f.sprints ?? [],
          stories: f.stories ?? [
            ...(f.story_done       > 0 ? Array(f.story_done).fill(0).map((_,i)       => ({ key: `done-${i}`, summary: "Completed story",   status: "Done"        })) : []),
            ...(f.story_in_progress > 0 ? Array(f.story_in_progress).fill(0).map((_,i) => ({ key: `wip-${i}`,  summary: "In progress story", status: "In Progress" })) : []),
            ...(f.story_todo       > 0 ? Array(f.story_todo).fill(0).map((_,i)       => ({ key: `todo-${i}`, summary: "To do story",       status: "To Do"       })) : []),
          ],
        }));

        setData({
          features,
          pis:     raw.pis     ?? [],
          sprints: raw.sprints ?? [],
        });
      })
      .catch(() => {
        setData(mockData());
      });
  }, []);

  if (!data) return <div className="loading">Loading roadmap…</div>;

  // ── Timeline bounds ────────────────────────────────────────────────────────
  const bands = granularity === "sprint" ? data.sprints : data.pis;
  const allDates = bands.flatMap(b => [new Date(b.start), new Date(b.end)]);
  const timelineStart = new Date(Math.min(...allDates.map(d => d.getTime())));
  const timelineEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
  const timelineDuration = (timelineEnd.getTime() - timelineStart.getTime()) / 86400000;

  // Today line position
  const now = new Date();
  const todayPct = Math.max(0, Math.min(100,
    (now.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime()) * 100
  ));

  // ── Feature list with sort + filter ───────────────────────────────────────
  let features = sortFeatures(data.features, sort);
  if (statusFilter === "at_risk") features = features.filter(f => isAtRisk(f) || isOverdue(f));
  else if (statusFilter === "in progress") features = features.filter(f => f.status.toLowerCase().includes("implement") || f.status.toLowerCase().includes("progress"));
  else if (statusFilter === "blocked") features = features.filter(f => f.status.toLowerCase() === "blocked");
  // "all" — no filter

  // ── Assignee grouping ─────────────────────────────────────────────────────
  const assigneeGroups: Record<string, Feature[]> = {};
  if (view === "assignee") {
    features.forEach(f => {
      const a = f.assignee || "Unassigned";
      if (!assigneeGroups[a]) assigneeGroups[a] = [];
      assigneeGroups[a].push(f);
    });
  }

  // ── Sprint grouping ───────────────────────────────────────────────────────
  const sprintGroups: Record<string, Feature[]> = {};
  if (view === "sprint") {
    data.sprints.forEach(s => {
      const inSprint = features.filter(f => f.sprints?.includes(s.name));
      if (inSprint.length > 0) sprintGroups[s.name] = inSprint;
    });
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  async function handleExport(format: "png" | "pdf") {
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(ganttRef.current!, { scale: 2, useCORS: true });
      if (format === "png") {
        const link = document.createElement("a");
        link.download = `roadmap-${new Date().toISOString().split("T")[0]}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`roadmap-${new Date().toISOString().split("T")[0]}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  }

  // ── Render feature rows ────────────────────────────────────────────────────
  function renderFeatureRow(f: Feature) {
    return (
      <div key={f.key} className={`gantt-row ${isOverdue(f) ? "row-overdue" : isAtRisk(f) ? "row-risk" : ""}`}>
        <div className="gantt-label">
          <span className="feature-key">{f.key}</span>
          <span className="feature-summary" title={f.summary}>{cleanSummary(f.summary)}</span>
          {f.assignee && <span className="feature-assignee">👤 {f.assignee}</span>}
        </div>
        <div className="gantt-track" style={{ position: "relative" }}>
          
            <GanttBar
            feature={f}
            timelineStart={timelineStart}
            timelineDuration={timelineDuration}
            granularity={granularity}
            sprints={data.sprints}
          />
        </div>
      </div>
    );
  }

  const statusCounts = {
    all: data.features.length,
    at_risk: data.features.filter(f => isAtRisk(f) || isOverdue(f)).length,
    "in progress": data.features.filter(f => f.status.toLowerCase().includes("implement") || f.status.toLowerCase().includes("progress")).length,
    blocked: data.features.filter(f => f.status.toLowerCase() === "blocked").length,
  };

  return (
    <>
      <style>{`
        :root {
          --blue: #2563eb;
          --blue-light: #dbeafe;
          --blue-mid: #93c5fd;
          --green: #16a34a;
          --red: #dc2626;
          --amber: #d97706;
          --gray-50: #f8fafc;
          --gray-100: #f1f5f9;
          --gray-200: #e2e8f0;
          --gray-400: #94a3b8;
          --gray-600: #475569;
          --gray-800: #1e293b;
          --text: #1e293b;
          --border: #e2e8f0;
          --radius: 6px;
          --font: -apple-system, "Segoe UI", system-ui, sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: var(--font); font-size: 15px; color: var(--text); background: var(--gray-50); }

        .page { padding: 24px; max-width: 100%; margin: 0 auto; }

        /* ── Header ── */
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .page-title { font-size: 24px; font-weight: 700; color: var(--gray-800); }
        .page-subtitle { font-size: 14px; color: var(--gray-600); margin-top: 2px; }

        /* ── Export buttons ── */
        .export-group { display: flex; gap: 8px; }
        .btn { padding: 8px 16px; border-radius: var(--radius); border: 1px solid var(--border); background: white; font-size: 14px; font-weight: 500; cursor: pointer; color: var(--gray-800); transition: background .15s; }
        .btn:hover { background: var(--gray-100); }
        .btn-primary { background: var(--blue); color: white; border-color: var(--blue); }
        .btn-primary:hover { background: #1d4ed8; }
        .btn:disabled { opacity: .5; cursor: default; }

        /* ── Controls bar ── */
        .controls { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
        .control-group { display: flex; align-items: center; gap: 6px; }
        .control-label { font-size: 13px; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: .04em; }
        select { padding: 7px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; color: var(--text); background: white; cursor: pointer; }

        /* ── Status filter pills ── */
        .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
        .pill { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: white; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--gray-600); transition: all .15s; }
        .pill:hover { border-color: var(--blue); color: var(--blue); }
        .pill.active { background: var(--blue); color: white; border-color: var(--blue); }
        .pill-count { background: rgba(255,255,255,.25); border-radius: 10px; padding: 1px 7px; margin-left: 4px; font-size: 12px; }
        .pill.active .pill-count { background: rgba(255,255,255,.3); }

        /* ── Gantt container ── */
        .gantt-container { background: white; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }

        /* ── Timeline header ── */
        .timeline-header { display: grid; grid-template-columns: 300px 1fr; border-bottom: 2px solid var(--border); }
        .timeline-header-label { padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--gray-600); border-right: 1px solid var(--border); }
       .timeline-bands { display: flex; position: relative; overflow: hidden; }
.timeline-band { display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--gray-800); border-right: 1px solid var(--border); padding: 8px 4px; text-align: center; overflow: hidden; }
.timeline-band.sprint { writing-mode: vertical-rl; transform: rotate(180deg); min-height: 48px; font-size: 10px; }
.timeline-band:nth-child(odd) { background: #eff6ff; }
.timeline-band:nth-child(even) { background: #dbeafe; }
        /* ── Gantt rows ── */
        .gantt-row { display: grid; grid-template-columns: 300px 1fr; border-bottom: 1px solid var(--gray-100); min-height: 56px; }
        .gantt-row:hover { background: var(--gray-50); }
        .gantt-row.row-overdue { background: #fff5f5; }
        .gantt-row.row-risk { background: #fffbeb; }
        .gantt-row.row-overdue:hover { background: #fee2e2; }
        .gantt-row.row-risk:hover { background: #fef3c7; }

        /* Group header rows */
        .group-header-row { display: grid; grid-template-columns: 300px 1fr; background: var(--gray-100); border-bottom: 1px solid var(--border); border-top: 2px solid var(--blue); }
        .group-header-label { padding: 8px 14px; font-size: 13px; font-weight: 700; color: var(--blue); border-right: 1px solid var(--border); display: flex; align-items: center; gap: 6px; }
        .group-header-track { padding: 8px 14px; font-size: 12px; color: var(--gray-600); display: flex; align-items: center; }

        /* Feature label column */
        .gantt-label { padding: 10px 14px; border-right: 1px solid var(--border); display: flex; flex-direction: column; justify-content: center; gap: 3px; overflow: hidden; }
        .feature-key { font-size: 12px; font-weight: 600; color: var(--blue); font-family: monospace; }
        .feature-summary { font-size: 14px; color: var(--gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .feature-assignee { font-size: 12px; color: var(--gray-400); }

        /* Gantt track (right side) */
        .gantt-track { position: relative; padding: 6px 8px; display: flex; align-items: center; }
        

        /* Bar */
        .gantt-bar-row { position: relative; width: 100%; display: flex; align-items: center; }
        .gantt-bar-track { position: relative; width: 100%; height: 32px; }
        .gantt-bar { position: absolute; top: 4px; height: 24px; border-radius: 4px; border: 2px solid var(--blue); overflow: hidden; display: flex; align-items: center; min-width: 4px; cursor: pointer; }
        .gantt-bar.overdue { border-color: var(--red) !important; }
        .gantt-bar.at-risk { border-color: var(--amber) !important; }
        .gantt-progress { position: absolute; left: 0; top: 0; bottom: 0; opacity: .25; }
        .gantt-bar-label { position: relative; z-index: 2; font-size: 11px; font-weight: 700; color: var(--gray-800); padding: 0 6px; white-space: nowrap; }
        .risk-badge { position: absolute; right: -8px; top: -6px; width: 16px; height: 16px; border-radius: 50%; background: var(--red); color: white; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center; z-index: 10; }

        /* Sprint markers inside bar */
        .sprint-marker { position: absolute; top: 2px; bottom: 2px; border-left: 1px dashed rgba(0,0,0,.2); pointer-events: none; }

        /* No dates */
        .no-dates { font-size: 13px; color: var(--gray-400); font-style: italic; padding: 4px 8px; }

        /* ── Tooltip ── */
        .gantt-tooltip { position: absolute; left: 10px; top: 36px; z-index: 100; background: white; border: 1px solid var(--border); border-radius: 8px; padding: 14px; width: 300px; box-shadow: 0 8px 24px rgba(0,0,0,.12); pointer-events: none; }
        .tt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .tt-key { font-size: 12px; font-weight: 700; font-family: monospace; color: var(--blue); }
        .tt-status { font-size: 12px; font-weight: 600; }
        .tt-summary { font-size: 14px; font-weight: 600; color: var(--gray-800); margin-bottom: 8px; }
        .tt-meta { display: flex; flex-direction: column; gap: 3px; font-size: 13px; color: var(--gray-600); margin-bottom: 8px; }
        .tt-progress-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .tt-progress-track { flex: 1; height: 7px; background: var(--gray-100); border-radius: 3px; overflow: hidden; }
        .tt-progress-fill { height: 100%; border-radius: 3px; transition: width .3s; }
        .tt-stories { display: flex; flex-direction: column; gap: 5px; }
        .tt-story { display: flex; align-items: center; gap: 6px; font-size: 12px; }
        .tt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .tt-dot.done { background: var(--green); }
        .tt-dot.blocked { background: var(--red); }
        .tt-dot.active { background: var(--blue); }
        .tt-story-key { font-family: monospace; font-weight: 600; color: var(--blue); flex-shrink: 0; }
        .tt-story-sum { color: var(--gray-600); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tt-story-sprint { font-size: 11px; color: var(--gray-400); flex-shrink: 0; background: var(--gray-100); padding: 1px 5px; border-radius: 3px; }
        .tt-more { font-size: 12px; color: var(--gray-400); padding-top: 2px; }

        /* ── Loading ── */
        .loading { padding: 48px; text-align: center; color: var(--gray-600); font-size: 16px; }

        /* ── Legend ── */
        .legend { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; padding: 12px 14px; background: var(--gray-50); border-top: 1px solid var(--border); font-size: 13px; color: var(--gray-600); }
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .legend-dot { width: 11px; height: 11px; border-radius: 2px; border: 2px solid; }

        @media (max-width: 768px) {
          .gantt-row, .timeline-header, .group-header-row { grid-template-columns: 180px 1fr; }
          .gantt-label { padding: 6px 8px; }
          .feature-summary { font-size: 13px; }
        }
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div>
            <div className="page-title">📅 Roadmap</div>
            <div className="page-subtitle">Cigna Commercial — ISAAC to Image One Migration</div>
          </div>
          <div className="export-group">
            <button className="btn" onClick={() => handleExport("png")} disabled={exporting}>
              {exporting ? "Exporting…" : "⬇ Export PNG"}
            </button>
            <button className="btn btn-primary" onClick={() => handleExport("pdf")} disabled={exporting}>
              {exporting ? "Exporting…" : "⬇ Export PDF"}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="controls">
          <div className="control-group">
            <span className="control-label">Sort</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)}>
              <option value="default">Default</option>
              <option value="at_risk">At Risk First</option>
              <option value="due_asc">Due Date ↑</option>
              <option value="due_desc">Due Date ↓</option>
              <option value="progress_asc">% Complete ↑</option>
              <option value="progress_desc">% Complete ↓</option>
            </select>
          </div>
          <div className="control-group">
            <span className="control-label">Group By</span>
            <select value={view} onChange={e => setView(e.target.value as ViewMode)}>
              <option value="feature">Feature (Flat)</option>
              <option value="assignee">Assignee</option>
              <option value="sprint">Sprint</option>
            </select>
          </div>
          <div className="control-group">
            <span className="control-label">Timeline</span>
            <select value={granularity} onChange={e => setGranularity(e.target.value as GranularityMode)}>
              <option value="pi">PI Bands</option>
              <option value="sprint">Sprint Bands</option>
            </select>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="filter-pills">
          {(["all", "at_risk", "in progress", "blocked"] as const).map(s => (
            <button key={s} className={`pill ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : s === "at_risk" ? "⚠ At Risk" : s === "in progress" ? "In Progress" : "🚫 Blocked"}
              <span className="pill-count">{statusCounts[s]}</span>
            </button>
          ))}
        </div>

        {/* Gantt */}
        <div className="gantt-container" ref={ganttRef}>
          {/* Timeline header */}
          <div className="timeline-header">
            <div className="timeline-header-label">Feature</div>
           <div className="timeline-bands" style={{ position: "relative" }}>
  <div style={{ position: "absolute", top: 0, bottom: 0, left: `${todayPct}%`, width: 2, background: "#f97316", opacity: 0.7, zIndex: 5, pointerEvents: "none" }} />
  {bands.map((b, i) => {
    const bStart = new Date(b.start);
    const bEnd = new Date(b.end);
    const bWidth = (bEnd.getTime() - bStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime()) * 100;
    return (
      <div key={i} className={`timeline-band ${granularity === "sprint" ? "sprint" : ""}`} style={{ width: `${bWidth}%` }}>
  {b.name}
</div>
    );
  })}
</div>
          </div>

          {/* Feature rows — flat */}
          {view === "feature" && features.map(renderFeatureRow)}

          {/* Assignee grouping */}
          {view === "assignee" && Object.entries(assigneeGroups).map(([assignee, aFeatures]) => (
            <div key={assignee}>
              <div className="group-header-row">
                <div className="group-header-label">👤 {assignee}</div>
                <div className="group-header-track">{aFeatures.length} feature{aFeatures.length !== 1 ? "s" : ""} · avg {Math.round(aFeatures.reduce((s, f) => s + f.progress, 0) / aFeatures.length)}% complete</div>
              </div>
              {aFeatures.map(renderFeatureRow)}
            </div>
          ))}

          {/* Sprint grouping */}
          {view === "sprint" && Object.entries(sprintGroups).map(([sprintName, sFeatures]) => (
            <div key={sprintName}>
              <div className="group-header-row">
                <div className="group-header-label">🏃 {sprintName}</div>
                <div className="group-header-track">{sFeatures.length} feature{sFeatures.length !== 1 ? "s" : ""} active this sprint</div>
              </div>
              {sFeatures.map(renderFeatureRow)}
            </div>
          ))}

          {features.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--gray-400)" }}>
              No features match the current filter.
            </div>
          )}

          {/* Legend */}
          <div className="legend">
            <span style={{ fontWeight: 600, color: "var(--gray-800)" }}>Legend:</span>
            <div className="legend-item"><div className="legend-dot" style={{ borderColor: "var(--blue)" }} /> On Track</div>
            <div className="legend-item"><div className="legend-dot" style={{ borderColor: "var(--amber)" }} /> At Risk (due ≤14d, &lt;80%)</div>
            <div className="legend-item"><div className="legend-dot" style={{ borderColor: "var(--red)" }} /> Overdue</div>
            <div className="legend-item"><div className="legend-dot" style={{ borderColor: "var(--green)" }} /> Complete</div>
            <div className="legend-item" style={{ marginLeft: "auto" }}>
              <div style={{ width: 16, height: 2, background: "#f97316", borderRadius: 1 }} /> Today
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
