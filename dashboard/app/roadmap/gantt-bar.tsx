"use client";

import { useState } from "react";
import type { Feature, GranularityMode, RoadmapData } from "./types";
import { parseDate, dateToPx, fmt, healthColor, isAtRisk, isOverdue, daysRemaining, cleanSummary } from "./types";

interface GanttBarProps {
  feature: Feature;
  origin: Date;
  granularity: GranularityMode;
  sprints: RoadmapData["sprints"];
  canvasWidth: number;
}

export default function GanttBar({ feature, origin, canvasWidth }: GanttBarProps) {
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
  // +1 day so bar extends through the end date (inclusive)
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
