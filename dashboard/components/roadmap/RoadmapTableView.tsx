"use client";

import { useState } from "react";

export type RoadmapView = "timeline" | "table";

export interface RoadmapTableViewProps {
  defaultView?: RoadmapView;
  onViewChange?: (view: RoadmapView) => void;
  timelineContent?: React.ReactNode;
  tableContent?: React.ReactNode;
}

/**
 * RoadmapTableView provides a Timeline / Table toggle for the Roadmap page.
 *
 * Spec: Wave 4.6
 * - Toggle between Timeline and Table views
 * - Placeholder table content until schema is defined
 */
export default function RoadmapTableView({
  defaultView = "timeline",
  onViewChange,
  timelineContent,
  tableContent,
}: RoadmapTableViewProps) {
  const [view, setView] = useState<RoadmapView>(defaultView);

  function handleChange(nextView: RoadmapView) {
    setView(nextView);
    onViewChange?.(nextView);
  }

  return (
    <div data-testid="roadmap-table-view">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          marginBottom: "var(--space-4)",
          padding: "var(--space-1)",
          background: "var(--color-fill-neutral)",
          borderRadius: "var(--radius-md)",
          width: "fit-content",
        }}
        role="tablist"
        aria-label="Roadmap view"
      >
        {(["timeline", "table"] as RoadmapView[]).map((v) => {
          const active = view === v;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`view-toggle-${v}`}
              onClick={() => handleChange(v)}
              style={{
                minHeight: 44,
                padding: "var(--space-1) var(--space-3)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: active ? "var(--color-surface-card)" : "transparent",
                color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontSize: "var(--font-size-body)",
                fontWeight: active ? "var(--font-weight-semi)" : "var(--font-weight-medium)",
                cursor: "pointer",
                boxShadow: active ? "var(--shadow-sm)" : "none",
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          );
        })}
      </div>

      {view === "timeline" && (
        <div data-testid="timeline-view">
          {timelineContent ?? (
            <p style={{ color: "var(--color-text-tertiary)" }}>
              Timeline view content goes here.
            </p>
          )}
        </div>
      )}

      {view === "table" && (
        <div data-testid="table-view">
          {tableContent ?? (
            <p style={{ color: "var(--color-text-tertiary)" }}>
              Table view content will be rendered here once the schema is defined.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
