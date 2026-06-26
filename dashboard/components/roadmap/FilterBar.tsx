"use client";

import type { Team } from "@/types/roadmap";

/**
 * FilterBar renders a horizontal toolbar of pill buttons for team filtering.
 *
 * The filter mechanism uses CSS-only visibility toggling: when a team is
 * selected, a `<style>` tag is injected that applies `display: none !important`
 * to all `.team-group` elements that do not match. This achieves sub-16ms filter
 * updates because no React re-render of the TeamGroup tree is needed.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 12.3
 */

export type TeamFilter = "All" | Team;

interface FilterBarProps {
  activeTeam: TeamFilter;
  onFilterChange: (team: TeamFilter) => void;
}

const TEAMS: TeamFilter[] = ["All", "Alpha", "Bravo", "Charlie"];

/**
 * Build the CSS rule that hides non-matching TeamGroup elements.
 * When "All" is selected, returns an empty string (no hiding).
 */
function buildFilterStyle(activeTeam: TeamFilter): string {
  if (activeTeam === "All") return "";
  return `.team-group:not(.team-group-${activeTeam.toLowerCase()}) { display: none !important; }`;
}

export default function FilterBar({ activeTeam, onFilterChange }: FilterBarProps) {
  const filterCss = buildFilterStyle(activeTeam);

  return (
    <>
      {/* CSS-only visibility toggle for sub-16ms filter updates */}
      {filterCss && <style dangerouslySetInnerHTML={{ __html: filterCss }} />}

      <div
        role="toolbar"
        aria-label="Team filter"
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 12px",
          alignItems: "center",
        }}
      >
        {TEAMS.map((team) => {
          const isActive = activeTeam === team;
          return (
            <button
              key={team}
              type="button"
              aria-pressed={isActive}
              onClick={() => onFilterChange(team)}
              style={{
                minHeight: 44,
                padding: "4px 14px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid",
                borderColor: isActive
                  ? "var(--color-interactive-primary)"
                  : "var(--color-border-default)",
                background: isActive
                  ? "var(--color-interactive-primary)"
                  : "transparent",
                color: isActive
                  ? "var(--color-text-inverse)"
                  : "var(--color-text-primary)",
                fontSize: "var(--font-size-body)",
                fontWeight: "var(--font-weight-medium)",
                cursor: "pointer",
                transition: "background 100ms ease, border-color 100ms ease",
                lineHeight: "20px",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-fill-info)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-surface-card)";
                }
              }}
            >
              {team}
            </button>
          );
        })}
      </div>
    </>
  );
}
