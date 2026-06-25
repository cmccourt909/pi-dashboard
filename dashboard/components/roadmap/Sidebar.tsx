"use client";

import type { FeatureItem, Team } from "@/types/roadmap";

/**
 * Props for the Sidebar component.
 */
export interface SidebarProps {
  /** All features to display, grouped by team */
  features: FeatureItem[];
  /** Currently active team filter */
  activeTeam: "All" | "Alpha" | "Bravo" | "Charlie";
  /** Optional callback when a feature label is clicked */
  onFeatureClick?: (feature: FeatureItem) => void;
}

/** The teams displayed in group order. */
const TEAMS: Team[] = ["Alpha", "Bravo", "Charlie"];

/** Row height in px — must match FeatureRow height for vertical alignment. */
const ROW_HEIGHT = 36;

/**
 * Sidebar renders a 200px fixed-width column to the left of the PI columns,
 * displaying feature labels (feature_key + summary) grouped by team.
 *
 * - Team group headers match TeamGroup styling for visual alignment
 * - CSS-only filtering via `data-team` attribute and `.team-group-*` classes
 * - Text is truncated with ellipsis when exceeding the 200px width
 * - Each feature row height matches the FeatureRow height for alignment
 *
 * Requirements: 1.2, 3.1
 */
export default function Sidebar({
  features,
  activeTeam,
  onFeatureClick,
}: SidebarProps) {
  // Group features by team
  const grouped = TEAMS.reduce<Record<Team, FeatureItem[]>>(
    (acc, team) => {
      acc[team] = features.filter((f) => f.team === team);
      return acc;
    },
    { Alpha: [], Bravo: [], Charlie: [] }
  );

  return (
    <aside
      data-testid="sidebar"
      style={{
        width: 200,
        minWidth: 200,
        maxWidth: 200,
        overflow: "hidden",
        borderRight: "1px solid var(--color-border, #e2e8f0)",
        background: "var(--color-surface, #ffffff)",
        flexShrink: 0,
      }}
      aria-label="Feature list sidebar"
    >
      {TEAMS.map((team) => {
        const teamFeatures = grouped[team];
        if (teamFeatures.length === 0) return null;

        const isHidden = activeTeam !== "All" && activeTeam !== team;

        return (
          <div
            key={team}
            className={`team-group team-group-${team.toLowerCase()}`}
            data-team={team}
            style={{
              display: isHidden ? "none" : "block",
            }}
          >
            {/* Team group header — matches TeamGroup header styling */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "6px 12px",
                borderBottom: "1px solid var(--color-border, #e2e8f0)",
                background: "var(--color-indigo-50, #f8fafc)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-indigo-900, #1e293b)",
                textAlign: "left",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
              aria-label={`Team ${team}`}
            >
              {team}
            </div>

            {/* Feature labels */}
            {teamFeatures.map((feature) => (
              <div
                key={feature.feature_key}
                data-feature-key={feature.feature_key}
                role="button"
                tabIndex={0}
                onClick={() => onFeatureClick?.(feature)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onFeatureClick?.(feature);
                  }
                }}
                title={`${feature.feature_key}: ${feature.summary}`}
                style={{
                  height: ROW_HEIGHT,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  cursor: onFeatureClick ? "pointer" : "default",
                  borderBottom: "1px solid var(--color-border-light, #f1f5f9)",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  outline: "none",
                }}
                aria-label={`${feature.feature_key}: ${feature.summary}`}
              >
                <span
                  style={{
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    fontSize: 13,
                    color: "var(--color-text, #334155)",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      marginRight: 6,
                      fontSize: 11,
                      color: "var(--color-text-muted, #64748b)",
                    }}
                  >
                    {feature.feature_key}
                  </span>
                  {feature.summary}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </aside>
  );
}
