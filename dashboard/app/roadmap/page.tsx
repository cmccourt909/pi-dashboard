"use client";

import { useEffect, useRef, useState } from "react";
import type { Feature, RoadmapData, SortKey, ViewMode, GranularityMode } from "./types";
import {
  PX_PER_DAY, parseDate, dateToPx, isAtRisk, isOverdue,
  cleanSummary, sortFeatures, mockData,
} from "./types";
import { ROADMAP_CSS } from "./styles";
import GanttBar from "./gantt-bar";

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
      .then((raw: Record<string, unknown>) => {
        const featureList = (raw.features ?? []) as Record<string, unknown>[];
        const features: Feature[] = featureList.map((f) => ({
          key: (f.issue_key ?? f.key) as string,
          summary: f.summary as string,
          status: (f.status ?? "Unknown") as string,
          progress: (f.pct_complete ?? f.progress ?? 0) as number,
          planned_start: (f.target_start_date || f.planned_start || undefined) as string | undefined,
          planned_end: (f.target_end_date || f.planned_end || undefined) as string | undefined,
          assignee: (f.assignee ?? undefined) as string | undefined,
          sprints: (f.sprints ?? []) as string[],
          stories: (f.stories ?? [
            ...((f.story_done as number) > 0 ? Array(f.story_done as number).fill(0).map((_, i) => ({ key: `done-${i}`, summary: "Completed story", status: "Done" })) : []),
            ...((f.story_in_progress as number) > 0 ? Array(f.story_in_progress as number).fill(0).map((_, i) => ({ key: `wip-${i}`, summary: "In progress story", status: "In Progress" })) : []),
            ...((f.story_todo as number) > 0 ? Array(f.story_todo as number).fill(0).map((_, i) => ({ key: `todo-${i}`, summary: "To do story", status: "To Do" })) : []),
          ]) as Feature["stories"],
        }));
        setData({ features, pis: (raw.pis ?? []) as RoadmapData["pis"], sprints: (raw.sprints ?? []) as RoadmapData["sprints"] });
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
    scrollRef.current.scrollLeft = Math.max(0, todayPx - scrollRef.current.clientWidth / 3);
  }, [data]);

  if (!data) return <div className="loading">Loading roadmap…</div>;

  // ── Timeline setup ────────────────────────────────────────────────────────
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
  const totalPx = dateToPx(timelineEnd, origin) + PX_PER_DAY * 14;

  // Month ruler
  const monthBands: { label: string; left: number; width: number }[] = [];
  const cursor = new Date(origin.getFullYear(), origin.getMonth(), 1, 12);
  const timelineEndDate = new Date(timelineEnd.getTime() + PX_PER_DAY * 14 * 86400000);
  while (cursor <= timelineEndDate) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
    const left = Math.max(0, dateToPx(monthStart, origin));
    const right = dateToPx(monthEnd, origin);
    monthBands.push({ label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), left, width: right - left });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const todayPx = dateToPx(new Date(), origin);

  // Feature filtering
  const datedFeatures = data.features.filter(f => !!parseDate(f.planned_start) && !!parseDate(f.planned_end));
  const undatedFeatures = data.features.filter(f => !parseDate(f.planned_start) || !parseDate(f.planned_end));
  const sourceFeatures = statusFilter === "no_dates" ? undatedFeatures : datedFeatures;

  let features = sortFeatures(sourceFeatures, sort);
  if (statusFilter === "at_risk") features = features.filter(f => isAtRisk(f) || isOverdue(f));
  else if (statusFilter === "in progress") features = features.filter(f => f.status.toLowerCase().includes("implement") || f.status.toLowerCase().includes("progress"));
  else if (statusFilter === "blocked") features = features.filter(f => f.status.toLowerCase() === "blocked");

  // Groupings
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

  // Export
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

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderLabelColumn() {
    return (
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
    );
  }

  function renderFeatureRows(featureList: Feature[]) {
    return featureList.map(f => (
      <div key={f.key} className={`gantt-row ${isOverdue(f) ? "row-overdue" : isAtRisk(f) ? "row-risk" : ""}`}>
        <div className="gantt-track" style={{ width: `${totalPx}px`, minWidth: `${totalPx}px` }}>
          <div className="today-line" style={{ left: `${todayPx}px` }} />
          <GanttBar feature={f} origin={origin} granularity={granularity} sprints={data.sprints} canvasWidth={totalPx} />
        </div>
      </div>
    ));
  }

  function renderTrackColumn() {
    return (
      <div className="gantt-scroll-col" ref={scrollRef}>
        <div className="gantt-canvas" style={{ width: `${totalPx}px` }}>
          {/* Month ruler */}
          <div className="month-ruler" style={{ width: `${totalPx}px` }}>
            <div className="today-line" style={{ left: `${todayPx}px` }} />
            {monthBands.map((m, i) => (
              <div key={i} className="month-band" style={{ left: `${m.left}px`, width: `${m.width}px` }}>{m.label}</div>
            ))}
          </div>

          {/* Timeline band header */}
          <div className={`timeline-header-row ${granularity === "sprint" ? "sprint-mode" : ""}`}>
            <div className="today-line" style={{ left: `${todayPx}px` }} />
            {bands.map((b, i) => {
              const bStart = parseDate(b.start)!;
              const bEnd = parseDate(b.end)!;
              const left = dateToPx(bStart, origin);
              const bEndInclusive = new Date(bEnd.getTime() + 86400000);
              const width = dateToPx(bEndInclusive, origin) - left;
              return (
                <div key={i} className={`timeline-band ${granularity === "sprint" ? "sprint" : ""}`} style={{ left: `${left}px`, width: `${width}px` }}>
                  {granularity === "sprint" ? <span>{b.name.replace("Sprint ", "")}</span> : b.name}
                </div>
              );
            })}
          </div>

          {/* Feature rows */}
          {view === "feature" && renderFeatureRows(features)}

          {/* Assignee grouping */}
          {view === "assignee" && Object.entries(assigneeGroups).map(([assignee, aFeatures]) => (
            <div key={assignee}>
              <div className="group-track-row" style={{ width: `${totalPx}px` }}>
                {aFeatures.length} feature{aFeatures.length !== 1 ? "s" : ""} · avg {Math.round(aFeatures.reduce((s, f) => s + f.progress, 0) / aFeatures.length)}% complete
              </div>
              {renderFeatureRows(aFeatures)}
            </div>
          ))}

          {/* Sprint grouping */}
          {view === "sprint" && Object.entries(sprintGroups).map(([sprintName, sFeatures]) => (
            <div key={sprintName}>
              <div className="group-track-row" style={{ width: `${totalPx}px` }}>
                {sFeatures.length} feature{sFeatures.length !== 1 ? "s" : ""} active this sprint
              </div>
              {renderFeatureRows(sFeatures)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Page render ────────────────────────────────────────────────────────────

  return (
    <>
      <style>{ROADMAP_CSS}</style>

      <div className="roadmap-page">
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

        {/* Filter pills */}
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

        {/* Gantt chart */}
        <div className="gantt-container" ref={ganttRef}>
          <div className="gantt-inner">
            {renderLabelColumn()}
            {renderTrackColumn()}
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
