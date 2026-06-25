"use client";

import React from "react";
import { SprintBreakdown } from "@/types/roadmap";

/** Team color map. */
const TEAM_COLORS: Record<string, string> = {
  Alpha: "#6366f1",
  Bravo: "#0891b2",
  Charlie: "#d97706",
};

/** Future sprint neutral color. */
const FUTURE_COLOR = "#e8e6e0";

/** Number of sprint bars to always render. */
const SPRINT_COUNT = 5;

export interface SprintMiniGridProps {
  sprints: SprintBreakdown[];
  team: "Alpha" | "Bravo" | "Charlie";
}

/**
 * Returns a CSS background for the diagonal hatch pattern used when a feature
 * has no stories scoped to a sprint.
 */
function hatchBackground(baseColor: string): string {
  return `repeating-linear-gradient(
    -45deg,
    ${baseColor},
    ${baseColor} 2px,
    transparent 2px,
    transparent 5px
  )`;
}

/**
 * Converts a hex color to an rgba string at the given opacity.
 */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Determines the background style for a single mini-bar.
 */
function getBarStyle(
  sprint: SprintBreakdown,
  teamColor: string
): React.CSSProperties {
  const hasNoStories = sprint.story_count === 0;

  if (sprint.state === "active") {
    const color = hexToRgba(teamColor, 0.55);
    if (hasNoStories) {
      return { background: hatchBackground(color) };
    }
    return { backgroundColor: color };
  }

  if (sprint.state === "future") {
    if (hasNoStories) {
      return { background: hatchBackground(FUTURE_COLOR) };
    }
    return { backgroundColor: FUTURE_COLOR };
  }

  // closed sprint: solid team color
  if (hasNoStories) {
    return { background: hatchBackground(teamColor) };
  }
  return { backgroundColor: teamColor };
}

/**
 * SprintMiniGrid renders exactly 5 mini-bars for the sprints in PI 26.3.
 *
 * - Active sprint: team color at 55% opacity
 * - Future sprint: #e8e6e0
 * - Closed sprint: team color (solid)
 * - No stories in sprint: diagonal hatch pattern
 * - Always renders 5 bars (pads with empty future bars if fewer provided)
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export default function SprintMiniGrid({ sprints, team }: SprintMiniGridProps) {
  const teamColor = TEAM_COLORS[team] ?? TEAM_COLORS.Alpha;

  // Normalize to exactly 5 sprints: take first 5, pad with empty future sprints
  const normalized: SprintBreakdown[] = [];
  for (let i = 0; i < SPRINT_COUNT; i++) {
    if (i < sprints.length) {
      normalized.push(sprints[i]);
    } else {
      normalized.push({
        sprint_name: `Sprint ${i + 1}`,
        state: "future",
        story_count: 0,
        done_count: 0,
      });
    }
  }

  return (
    <div
      data-testid="sprint-mini-grid"
      style={{ display: "flex", gap: 2, alignItems: "center" }}
      role="group"
      aria-label="Sprint progress indicators"
    >
      {normalized.map((sprint) => (
        <div
          key={sprint.sprint_name}
          aria-label={`${sprint.sprint_name}: ${sprint.done_count}/${sprint.story_count} done`}
          style={{
            width: 12,
            height: 16,
            borderRadius: 2,
            ...getBarStyle(sprint, teamColor),
          }}
        />
      ))}
    </div>
  );
}
