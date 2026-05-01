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

// ─── Constants ────────────────────────────────────────────────────────────────

const PX_PER_DAY = 10; // pixels per day — increase for more zoom
const LABEL_WIDTH = 300; // px — left label column width

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Parse YYYY-MM-DD as local noon to avoid UTC-midnight timezone shift
const parseDate = (s?: string) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Convert a date to pixel offset from timeline origin
const dateToPx = (date: Date, origin: Date) =>
  Math.round((date.getTime() - origin.getTime()) / 86400000 * PX_PER_DAY);

function isAtRisk(f: Feature): boolean {
  const end = parseDate(f.planned_end);
  if (!end) return false;
  const now = new Date();
  const daysLeft = (end.getTime() - now.getTime()) / 86400000;
  if (end < now && f.progress < 100) return true;
  if (daysLeft <= 21 && f.progress < 80) return true;
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

// ─── Mock Data ────────────────────────────────────────────────────────────────

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
    sprints: [],
    features: [
      { key: "EVLGCN-101", summary: "ISAAC Policy Migration", status: "In Progress", progress: 85, planned_start: d(-60), planned_end: d(10), assignee: "Sarah M.", stories: [] },
      { key: "EVLGCN-102", summary: "Image One API Integration", status: "In Progress", progress: 62, planned_start: d(-45), planned_end: d(20), assignee: "James T.", stories: [] },
    ],
  };
}

// ─── Gantt Bar (pixel-based) ──────────────────────────────────────────────────

function GanttBar({ feature, origin, granularity, sprints, canvasWidth }: {
  feature: Feature;
  origin: Date;
  granularity: GranularityMode;
  sprints: RoadmapData["sprints"];
  canvasWidth: number;
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

  const left = dateToPx(start, origin);
  // +1 day so bar extends through the end date (inclusive), aligning with PI band boundaries
  const endInclusive = new Date(end.getTime() + 86400000);
  const width = Math.max(8, dateToPx(endInclusive, origin) - left);
  const color = healthColor(feature);
  const days = daysRemaining(feature);

  return (
    <div className="gantt-bar-row" onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
      <div className="gantt-bar-track" style={{ width: `${canvasWidth}px` }}>
        <div
          className={`gantt-bar ${isOverdue(feature) ? "overdue" : isAtRisk(feature) ? "at-risk" : ""}`}
          style={{ left: `${left}px`, width: `${width}px`, borderColor: color }}
        >
          <div className="gantt-progress" style={{ width: `${feature.progress}%`, background: color }} />
          <span className="gantt-bar-label">{feature.progress}%</span>
          {(isAtRisk(feature) || isOverdue(feature)) && (
            <span className="risk-badge">!</span>
          )}
        </div>

        {tooltip && (
          <div className="gantt-tooltip" style={{ left: `${left}px` }}>
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
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [sort, setSort] = useState<SortKey>("default");
  const [view, setView] = useState<ViewMode>("feature");
  const [granularity, setGranularity] = useState<GranularityMode>("pi");
  const [statusFilter, setStatusFilter] = useState<string>("planned");
  const [exporting, setExporting] = useState(false);
  const ganttRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          planned_start: f.target_start_date || f.planned_start || undefined,
          planned_end: f.target_end_date || f.planned_end || undefined,
          assignee: f.assignee ?? undefined,
          sprints: f.sprints ?? [],
          stories: f.stories ?? [
            ...(f.story_done > 0 ? Array(f.story_done).fill(0).map((_: any, i: number) => ({ key: `done-${i}`, summary: "Completed story", status: "Done" })) : []),
            ...(f.story_in_progress > 0 ? Array(f.story_in_progress).fill(0).map((_: any, i: number) => ({ key: `wip-${i}`, summary: "In progress story", status: "In Progress" })) : []),
            ...(f.story_todo > 0 ? Array(f.story_todo).fill(0).map((_: any, i: number) => ({ key: `todo-${i}`, summary: "To do story", status: "To Do" })) : []),
          ],
        }));
        setData({ features, pis: raw.pis ?? [], sprints: raw.sprints ?? [] });
      })
      .catch(() => setData(mockData()));
  }, []);

  // Auto-scroll to today on load
  useEffect(() => {
    if (!data || !scrollRef.current) return;
    const pis = data.pis;
    if (!pis.length) return;
    const origin = parseDate(pis[0].start)!;
    const todayPx = dateToPx(new Date(), origin);
    // Scroll so today is roughly 1/3 from the left
    scrollRef.current.scrollLeft = Math.max(0, todayPx - scrollRef.current.clientWidth / 3);
  }, [data]);

  if (!data) return <div className="loading">Loading roadmap…</div>;

  // ── Timeline origin = start of first PI ───────────────────────────────────
  // For sprint bands: only canonical "Sprint XX.X.X" entries, deduped by name, sorted by start
  const canonicalSprints = Array.from(
    data.sprints
      .filter(s => /^Sprint \d+\.\d+\.\d+$/.test(s.name) && parseDate(s.start) && parseDate(s.end))
      .reduce((map, s) => { if (!map.has(s.name)) map.set(s.name, s); return map; }, new Map<string, typeof data.sprints[0]>())
      .values()
  ).sort((a, b) => parseDate(a.start)!.getTime() - parseDate(b.start)!.getTime());
  const bands = granularity === "sprint" ? canonicalSprints : data.pis;
  const allPIDates = data.pis.flatMap(p => [parseDate(p.start)!, parseDate(p.end)!]);
  const origin = new Date(Math.min(...allPIDates.map(d => d.getTime())));
  const timelineEnd = new Date(Math.max(...allPIDates.map(d => d.getTime())));
  const totalPx = dateToPx(timelineEnd, origin) + PX_PER_DAY * 14; // 14-day right padding

  // ── Month ruler ───────────────────────────────────────────────────────────
  // Build list of months spanning the full timeline
  const monthBands: { label: string; left: number; width: number }[] = [];
  const cursor = new Date(origin.getFullYear(), origin.getMonth(), 1, 12);
  const timelineEndDate = new Date(timelineEnd.getTime() + PX_PER_DAY * 14 * 86400000);
  while (cursor <= timelineEndDate) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
    const left = Math.max(0, dateToPx(monthStart, origin));
    const right = dateToPx(monthEnd, origin);
    monthBands.push({
      label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      left,
      width: right - left,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Today line
  const todayPx = dateToPx(new Date(), origin);
  // Exclude features with no planned dates — they add no value to a timeline view
  const datedFeatures = data.features.filter(f => !!parseDate(f.planned_start) && !!parseDate(f.planned_end));
  const undatedFeatures = data.features.filter(f => !parseDate(f.planned_start) || !parseDate(f.planned_end));
  const sourceFeatures = statusFilter === "no_dates" ? undatedFeatures : datedFeatures;

  let features = sortFeatures(sourceFeatures, sort);
  if (statusFilter === "at_risk") features = features.filter(f => isAtRisk(f) || isOverdue(f));
  else if (statusFilter === "in progress") features = features.filter(f => f.status.toLowerCase().includes("implement") || f.status.toLowerCase().includes("progress"));
  else if (statusFilter === "blocked") features = features.filter(f => f.status.toLowerCase() === "blocked");

  // ── Groupings ─────────────────────────────────────────────────────────────
  const assigneeGroups: Record<string, Feature[]> = {};
  if (view === "assignee") {
    features.forEach(f => {
      const a = f.assignee || "Unassigned";
      assigneeGroups[a] = [...(assigneeGroups[a] || []), f];
    });
  }

  const sprintGroups: Record<string, Feature[]> = {};
  if (view === "sprint") {
    features.forEach(f => {
      (f.sprints || []).forEach(sprintName => {
        sprintGroups[sprintName] = [...(sprintGroups[sprintName] || []), f];
      });
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async function handleExport(type: "png" | "pdf") {
    if (!ganttRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(ganttRef.current, { scale: 2, useCORS: true });
      if (type === "png") {
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

  const statusCounts = {
    planned: datedFeatures.length,
    all: datedFeatures.length,
    at_risk: datedFeatures.filter(f => isAtRisk(f) || isOverdue(f)).length,
    "in progress": datedFeatures.filter(f => f.status.toLowerCase().includes("implement") || f.status.toLowerCase().includes("progress")).length,
    blocked: datedFeatures.filter(f => f.status.toLowerCase() === "blocked").length,
    no_dates: undatedFeatures.length,
  };

  return (
    <>
      <style>{`
        :root {
          --blue: #2563eb; --blue-light: #dbeafe; --blue-mid: #93c5fd;
          --green: #16a34a; --red: #dc2626; --amber: #d97706;
          --gray-50: #f8fafc; --gray-100: #f1f5f9; --gray-200: #e2e8f0;
          --gray-400: #94a3b8; --gray-600: #475569; --gray-800: #1e293b;
          --text: #1e293b; --border: #e2e8f0; --radius: 6px;
          --font: -apple-system, "Segoe UI", system-ui, sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font); font-size: 15px; color: var(--text); background: var(--gray-50); }
        .page { padding: 24px; max-width: 100%; margin: 0 auto; }

        /* Header */
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .page-title { font-size: 24px; font-weight: 700; color: var(--gray-800); }
        .page-subtitle { font-size: 14px; color: var(--gray-600); margin-top: 2px; }

        /* Buttons */
        .export-group { display: flex; gap: 8px; }
        .btn { padding: 8px 16px; border-radius: var(--radius); border: 1px solid var(--border); background: white; font-size: 14px; font-weight: 500; cursor: pointer; color: var(--gray-800); transition: background .15s; }
        .btn:hover { background: var(--gray-100); }
        .btn-primary { background: var(--blue); color: white; border-color: var(--blue); }
        .btn-primary:hover { background: #1d4ed8; }
        .btn:disabled { opacity: .5; cursor: default; }

        /* Controls */
        .controls { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
        .control-group { display: flex; align-items: center; gap: 6px; }
        .control-label { font-size: 13px; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: .04em; }
        select { padding: 7px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; color: var(--text); background: white; cursor: pointer; }

        /* Pills */
        .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
        .pill { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: white; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--gray-600); transition: all .15s; }
        .pill:hover { border-color: var(--blue); color: var(--blue); }
        .pill.active { background: var(--blue); color: white; border-color: var(--blue); }
        .pill-count { background: rgba(255,255,255,.25); border-radius: 10px; padding: 1px 7px; margin-left: 4px; font-size: 12px; }
        .pill.active .pill-count { background: rgba(255,255,255,.3); }

        /* ── Gantt container: label col fixed, track col scrolls ── */
        .gantt-container { background: white; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .gantt-inner { display: flex; }

        /* Fixed label column */
        .gantt-labels-col { flex-shrink: 0; width: ${LABEL_WIDTH}px; border-right: 2px solid var(--border); z-index: 10; background: white; }
        .gantt-label-header { height: 80px; padding: 0 14px; display: flex; align-items: center; font-size: 13px; font-weight: 600; color: var(--gray-600); border-bottom: 2px solid var(--border); }
        .gantt-label { padding: 10px 14px; display: flex; flex-direction: column; justify-content: center; gap: 3px; overflow: hidden; border-bottom: 1px solid var(--gray-100); min-height: 56px; }
        .feature-key { font-size: 12px; font-weight: 600; color: var(--blue); font-family: monospace; }
        .feature-summary { font-size: 14px; color: var(--gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .feature-assignee { font-size: 12px; color: var(--gray-400); }

        /* Scrollable track column */
        .gantt-scroll-col { flex: 1; overflow-x: auto; overflow-y: hidden; }
        .gantt-scroll-col::-webkit-scrollbar { height: 8px; }
        .gantt-scroll-col::-webkit-scrollbar-track { background: var(--gray-100); }
        .gantt-scroll-col::-webkit-scrollbar-thumb { background: var(--gray-400); border-radius: 4px; }

        /* The inner canvas — fixed pixel width */
        .gantt-canvas { position: relative; }

        /* Month ruler */
        .month-ruler { height: 28px; position: relative; border-bottom: 1px solid var(--border); background: #1e3a5f; }
        .month-band { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #e2eaf4; border-right: 1px solid rgba(255,255,255,0.15); white-space: nowrap; overflow: hidden; letter-spacing: 0.04em; text-transform: uppercase; }

        /* Timeline band header */
        .timeline-header-row { height: 80px; position: relative; border-bottom: 2px solid var(--border); display: flex; align-items: stretch; overflow: hidden; background: linear-gradient(to right, #eff6ff 0%, #eff6ff 50%, #dbeafe 50%, #dbeafe 100%); background-size: 280px 100%; }
        .timeline-header-row.sprint-mode { background: #f8fafc; overflow: visible; }
        .timeline-band { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--gray-800); border-right: 1px solid var(--border); overflow: hidden; padding: 0 4px; text-align: center; }
        .timeline-band.sprint { overflow: visible; z-index: 2; background: transparent !important; padding: 0; }
        .timeline-band.sprint span { position: absolute; bottom: 8px; left: 50%; display: inline-block; transform: rotate(-45deg); transform-origin: left bottom; font-size: 11px; font-weight: 600; color: var(--gray-800); white-space: nowrap; line-height: 1; }
        .sprint-label-main { font-size: 11px; font-weight: 700; color: var(--gray-800); }
        .sprint-label-dates { font-size: 9px; font-weight: 400; color: var(--gray-600); }
        .timeline-band:nth-child(odd) { background: #eff6ff; }
        .timeline-band:nth-child(even) { background: #dbeafe; }

        /* Today line */
        .today-line { position: absolute; top: 0; bottom: 0; width: 2px; background: #f97316; opacity: 0.8; z-index: 5; pointer-events: none; }

        /* Gantt rows */
        .gantt-row { display: flex; border-bottom: 1px solid var(--gray-100); min-height: 56px; }
        .gantt-row:hover { background: var(--gray-50); }
        .gantt-row.row-overdue { background: #fff5f5; }
        .gantt-row.row-risk { background: #fffbeb; }
        .gantt-row.row-overdue:hover { background: #fee2e2; }
        .gantt-row.row-risk:hover { background: #fef3c7; }

        /* Group headers */
        .group-label-row { padding: 8px 14px; font-size: 13px; font-weight: 700; color: var(--blue); border-bottom: 1px solid var(--border); border-top: 2px solid var(--blue); background: var(--gray-100); min-height: 40px; display: flex; align-items: center; }
        .group-track-row { padding: 8px 14px; font-size: 12px; color: var(--gray-600); display: flex; align-items: center; background: var(--gray-100); border-bottom: 1px solid var(--border); }

        /* Track */
        .gantt-track { position: relative; flex-shrink: 0; padding: 6px 0; display: flex; align-items: center; overflow: visible; }
        .gantt-bar-row { position: relative; display: flex; align-items: center; overflow: visible; }
        .gantt-bar-track { position: relative; height: 32px; overflow: visible; }

        /* Bar — positioned in pixels from left of canvas */
        .gantt-bar { position: absolute; top: 4px; height: 24px; border-radius: 4px; border: 2px solid var(--blue); overflow: hidden; display: flex; align-items: center; min-width: 8px; cursor: pointer; }
        .gantt-bar.overdue { border-color: var(--red) !important; }
        .gantt-bar.at-risk { border-color: var(--amber) !important; }
        .gantt-progress { position: absolute; left: 0; top: 0; bottom: 0; opacity: .25; }
        .gantt-bar-label { position: relative; z-index: 2; font-size: 11px; font-weight: 700; color: var(--gray-800); padding: 0 6px; white-space: nowrap; }
        .risk-badge { position: absolute; right: -8px; top: -6px; width: 16px; height: 16px; border-radius: 50%; background: var(--red); color: white; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center; z-index: 10; }

        /* No dates */
        .no-dates { font-size: 13px; color: var(--gray-400); font-style: italic; padding: 4px 8px; position: absolute; left: 8px; }

        /* Tooltip */
        .gantt-tooltip { position: absolute; top: 36px; z-index: 100; background: white; border: 1px solid var(--border); border-radius: 8px; padding: 14px; width: 300px; box-shadow: 0 8px 24px rgba(0,0,0,.12); pointer-events: none; }
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

        /* Loading */
        .loading { padding: 48px; text-align: center; color: var(--gray-600); font-size: 16px; }

        /* Legend */
        .legend { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; padding: 12px 14px; background: var(--gray-50); border-top: 1px solid var(--border); font-size: 13px; color: var(--gray-600); }
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .legend-dot { width: 11px; height: 11px; border-radius: 2px; border: 2px solid; }

        /* Scroll hint */
        .scroll-hint { font-size: 12px; color: var(--gray-400); text-align: right; margin-bottom: 4px; }
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

        {/* Pills */}
        <div className="filter-pills">
          {([
            { key: "planned", label: "Planned" },
            { key: "at_risk", label: "⚠ At Risk" },
            { key: "in progress", label: "In Progress" },
            { key: "blocked", label: "🚫 Blocked" },
            { key: "all", label: "All" },
            { key: "no_dates", label: "📅 No Dates" },
          ] as const).map(({ key, label }) => (
            <button key={key} className={`pill ${statusFilter === key ? "active" : ""}`} onClick={() => setStatusFilter(key)}>
              {label}
              <span className="pill-count">{statusCounts[key as keyof typeof statusCounts]}</span>
            </button>
          ))}
        </div>

        <div className="scroll-hint">← Scroll timeline horizontally →</div>

        {/* Gantt */}
        <div className="gantt-container" ref={ganttRef}>
          <div className="gantt-inner">

            {/* ── Fixed label column ── */}
            <div className="gantt-labels-col">
              <div className="gantt-label-header">
                <div style={{ height: 28, background: '#1e3a5f', margin: '-1px -14px 0', padding: '0 14px', display: 'flex', alignItems: 'center', color: '#e2eaf4', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Timeline</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>Feature</div>
              </div>

              {view === "feature" && features.map(f => (
                <div key={f.key} className={`gantt-label ${isOverdue(f) ? "row-overdue" : isAtRisk(f) ? "row-risk" : ""}`}>
                  <span className="feature-key">{f.key}</span>
                  <span className="feature-summary" title={f.summary}>{cleanSummary(f.summary)}</span>
                  {f.assignee && <span className="feature-assignee">👤 {f.assignee}</span>}
                </div>
              ))}

              {view === "assignee" && Object.entries(assigneeGroups).map(([assignee, aFeatures]) => (
                <div key={assignee}>
                  <div className="group-label-row">👤 {assignee}</div>
                  {aFeatures.map(f => (
                    <div key={f.key} className={`gantt-label ${isOverdue(f) ? "row-overdue" : isAtRisk(f) ? "row-risk" : ""}`}>
                      <span className="feature-key">{f.key}</span>
                      <span className="feature-summary" title={f.summary}>{cleanSummary(f.summary)}</span>
                    </div>
                  ))}
                </div>
              ))}

              {view === "sprint" && Object.entries(sprintGroups).map(([sprintName, sFeatures]) => (
                <div key={sprintName}>
                  <div className="group-label-row">🏃 {sprintName}</div>
                  {sFeatures.map(f => (
                    <div key={f.key} className={`gantt-label ${isOverdue(f) ? "row-overdue" : isAtRisk(f) ? "row-risk" : ""}`}>
                      <span className="feature-key">{f.key}</span>
                      <span className="feature-summary" title={f.summary}>{cleanSummary(f.summary)}</span>
                    </div>
                  ))}
                </div>
              ))}

              {features.length === 0 && <div style={{ padding: "32px 14px", color: "var(--gray-400)", fontSize: 14 }}>No features match.</div>}
            </div>

            {/* ── Scrollable track column ── */}
            <div className="gantt-scroll-col" ref={scrollRef}>
              <div className="gantt-canvas" style={{ width: `${totalPx}px` }}>

                {/* Month ruler */}
                <div className="month-ruler" style={{ width: `${totalPx}px` }}>
                  <div className="today-line" style={{ left: `${todayPx}px` }} />
                  {monthBands.map((m, i) => (
                    <div key={i} className="month-band" style={{ left: `${m.left}px`, width: `${m.width}px` }}>
                      {m.label}
                    </div>
                  ))}
                </div>

                {/* Timeline band header */}
                <div className={`timeline-header-row ${granularity === "sprint" ? "sprint-mode" : ""}`}>
                  {/* Today line in header */}
                  <div className="today-line" style={{ left: `${todayPx}px` }} />
                  {bands.map((b, i) => {
                    const bStart = parseDate(b.start)!;
                    const bEnd = parseDate(b.end)!;
                    const left = dateToPx(bStart, origin);
                    // +1 day so band extends through end date inclusive
                    const bEndInclusive = new Date(bEnd.getTime() + 86400000);
                    const width = dateToPx(bEndInclusive, origin) - left;
                    return (
                      <div key={i}
                        className={`timeline-band ${granularity === "sprint" ? "sprint" : ""}`}
                        style={{ left: `${left}px`, width: `${width}px` }}>
                        {granularity === "sprint"
                          ? <span>{b.name.replace("Sprint ", "")}</span>
                          : b.name}
                      </div>
                    );
                  })}
                </div>

                {/* Feature rows */}
                {view === "feature" && features.map(f => (
                  <div key={f.key} className={`gantt-row ${isOverdue(f) ? "row-overdue" : isAtRisk(f) ? "row-risk" : ""}`}>
                    <div className="gantt-track" style={{ width: `${totalPx}px`, minWidth: `${totalPx}px` }}>
                      <div className="today-line" style={{ left: `${todayPx}px` }} />
                      <GanttBar feature={f} origin={origin} granularity={granularity} sprints={data.sprints} canvasWidth={totalPx} />
                    </div>
                  </div>
                ))}

                {/* Assignee grouping */}
                {view === "assignee" && Object.entries(assigneeGroups).map(([assignee, aFeatures]) => (
                  <div key={assignee}>
                    <div className="group-track-row" style={{ width: `${totalPx}px` }}>
                      {aFeatures.length} feature{aFeatures.length !== 1 ? "s" : ""} · avg {Math.round(aFeatures.reduce((s, f) => s + f.progress, 0) / aFeatures.length)}% complete
                    </div>
                    {aFeatures.map(f => (
                      <div key={f.key} className={`gantt-row ${isOverdue(f) ? "row-overdue" : isAtRisk(f) ? "row-risk" : ""}`}>
                        <div className="gantt-track" style={{ width: `${totalPx}px`, minWidth: `${totalPx}px` }}>
                          <div className="today-line" style={{ left: `${todayPx}px` }} />
                          <GanttBar feature={f} origin={origin} granularity={granularity} sprints={data.sprints} canvasWidth={totalPx} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Sprint grouping */}
                {view === "sprint" && Object.entries(sprintGroups).map(([sprintName, sFeatures]) => (
                  <div key={sprintName}>
                    <div className="group-track-row" style={{ width: `${totalPx}px` }}>
                      {sFeatures.length} feature{sFeatures.length !== 1 ? "s" : ""} active this sprint
                    </div>
                    {sFeatures.map(f => (
                      <div key={f.key} className={`gantt-row ${isOverdue(f) ? "row-overdue" : isAtRisk(f) ? "row-risk" : ""}`}>
                        <div className="gantt-track" style={{ width: `${totalPx}px`, minWidth: `${totalPx}px` }}>
                          <div className="today-line" style={{ left: `${todayPx}px` }} />
                          <GanttBar feature={f} origin={origin} granularity={granularity} sprints={data.sprints} canvasWidth={totalPx} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="legend">
            <span style={{ fontWeight: 600, color: "var(--gray-800)" }}>Legend:</span>
            <div className="legend-item"><div className="legend-dot" style={{ borderColor: "var(--blue)" }} /> On Track</div>
            <div className="legend-item"><div className="legend-dot" style={{ borderColor: "var(--amber)" }} /> At Risk (due ≤21d, &lt;80%)</div>
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
