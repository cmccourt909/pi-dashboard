import React from "react";
import TeamHealthRow from "./TeamHealthRow";
import { TeamHealth } from "./types";

interface PIHealthSectionProps {
  piName: string;
  overallCompletionPct: number;
  teams: TeamHealth[];
  daysRemaining: number;
}

/**
 * Determines the progress bar fill color based on completion percentage.
 * - >=60% → success (teal / on-track)
 * - 30-59% → warning (amber / at-risk)
 * - <30% → danger (coral / critical)
 */
function getProgressColor(pct: number): string {
  if (pct >= 60) return "var(--color-status-success)";
  if (pct >= 30) return "var(--color-status-warning)";
  return "var(--color-status-danger)";
}

/**
 * PI Health Section — displays overall PI progress and per-team health indicators.
 *
 * Renders in the right column of the two-column layout. Shows a progress bar
 * for overall PI completion and a list of team health rows with color-coded
 * status indicators.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export default function PIHealthSection({
  piName,
  overallCompletionPct,
  teams,
  daysRemaining,
}: PIHealthSectionProps) {
  // Show empty state when no PI data is available
  if (!piName || teams.length === 0) {
    return (
      <section
        className="rounded-lg p-6"
        style={{
          backgroundColor: "var(--color-surface-primary)",
          boxShadow: "var(--shadow-card)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--color-text-primary)" }}
        >
          PI Health
        </h2>
        <p
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          No program increment data available
        </p>
      </section>
    );
  }

  // Clamp percentage between 0 and 100
  const clampedPct = Math.max(0, Math.min(100, overallCompletionPct));
  const progressColor = getProgressColor(clampedPct);

  return (
    <section
      className="rounded-lg p-6"
      style={{
        backgroundColor: "var(--color-surface-primary)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          PI Health
        </h2>
        <span
          className="text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {daysRemaining} days remaining
        </span>
      </div>

      {/* PI name and overall progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {piName}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {clampedPct}%
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--color-surface-secondary, #e5e7eb)" }}
        >
          <div
            role="progressbar"
            aria-valuenow={clampedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${piName} overall completion`}
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${clampedPct}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
      </div>

      {/* Team health rows */}
      <div className="space-y-1">
        <h3
          className="text-sm font-medium mb-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Team Health
        </h3>
        {teams.map((team) => (
          <TeamHealthRow key={team.name} team={team} />
        ))}
      </div>
    </section>
  );
}
