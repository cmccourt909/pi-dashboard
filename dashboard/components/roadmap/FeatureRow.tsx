"use client";

import React, { useCallback } from "react";
import { FeatureItem } from "../../types/roadmap";
import GanttBar from "./GanttBar";
import SprintMiniGrid from "./SprintMiniGrid";
import BlockerFlag from "./BlockerFlag";

/**
 * Props for the FeatureRow component.
 */
export interface FeatureRowProps {
  /** The feature data to display */
  feature: FeatureItem;
  /** Width of the PI column in pixels */
  piColumnWidth: number;
  /** Callback when the row is selected (opens Detail Drawer) */
  onSelect: (feature: FeatureItem) => void;
  /** Which PI column this row is in */
  piName: string;
}

/**
 * FeatureRow renders a single horizontal row in the Gantt chart.
 *
 * Composes GanttBar (PI progress), SprintMiniGrid (PI 26.3 sprint breakdown),
 * and BlockerFlag (cross-team dependencies).
 *
 * - Clicking the row opens the Detail Drawer via onSelect callback
 * - Keyboard accessible: Enter/Space triggers selection
 * - data-team attribute enables CSS-only team filtering
 *
 * Requirements: 3.1, 3.2
 */
export default function FeatureRow({
  feature,
  piColumnWidth,
  onSelect,
  piName,
}: FeatureRowProps) {
  const handleClick = useCallback(() => {
    onSelect(feature);
  }, [onSelect, feature]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(feature);
      }
    },
    [onSelect, feature]
  );

  // Find the PI completion data for the current PI column
  const piCompletion = feature.pi_completion.find(
    (pc) => pc.pi_name === piName
  );

  const donePct = piCompletion?.done_pct ?? 0;
  const progPct = piCompletion?.prog_pct ?? 0;
  const todoPct = piCompletion?.todo_pct ?? 100;

  // Determine if this feature has cross-team blockers
  const hasCrossTeamBlocker =
    feature.blockers.length > 0 || feature.is_blocked_by.length > 0;

  return (
    <div
      data-testid="feature-row"
      data-team={feature.team}
      data-feature-key={feature.feature_key}
      role="row"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Feature: ${feature.summary}, Team: ${feature.team}, ${Math.round(donePct)}% done`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        cursor: "pointer",
        borderRadius: 4,
        transition: "background-color 0.15s ease",
        outline: "none",
      }}
      // Inline hover/focus styles handled via CSS class in production;
      // here we rely on the focus-visible browser default plus the outline: none
      // being overridden by focus-visible styling at the page level.
    >
      {/* Gantt progress bar */}
      <div style={{ flex: "0 0 auto" }}>
        <GanttBar
          donePct={donePct}
          progPct={progPct}
          todoPct={todoPct}
          columnWidth={piColumnWidth}
        />
      </div>

      {/* Sprint Mini Grid — only shown for PI 26.3 */}
      {piName === "PI 26.3" && feature.sprint_breakdown.length > 0 && (
        <div style={{ flex: "0 0 auto" }}>
          <SprintMiniGrid sprints={feature.sprint_breakdown} team={feature.team} />
        </div>
      )}

      {/* Blocker flag for cross-team dependencies */}
      <BlockerFlag
        hasCrossTeamBlocker={hasCrossTeamBlocker}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(feature);
        }}
      />
    </div>
  );
}
