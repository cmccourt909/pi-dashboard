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
                padding: "4px 14px",
                borderRadius: 9999,
                border: "1px solid",
                borderColor: isActive
                  ? "var(--filter-pill-active-border, #4f46e5)"
                  : "var(--filter-pill-border, #cbd5e1)",
                background: isActive
                  ? "var(--filter-pill-active-bg, #4f46e5)"
                  : "var(--filter-pill-bg, transparent)",
                color: isActive
                  ? "var(--filter-pill-active-text, #ffffff)"
                  : "var(--filter-pill-text, #334155)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 100ms ease, border-color 100ms ease",
                lineHeight: "20px",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--filter-pill-hover-bg, #f1f5f9)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--filter-pill-bg, transparent)";
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
