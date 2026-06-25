"use client";

import { useState } from "react";
import type { Team } from "@/types/roadmap";

/**
 * TeamGroup wraps multiple FeatureRow components belonging to a single team,
 * providing a collapsible section with a clickable team header.
 *
 * CSS class names (`team-group`, `team-group-{team}`) and the `data-team`
 * attribute enable CSS-only filter toggling — the FilterBar injects styles
 * that set `display:none` on groups not matching the active filter.
 *
 * Requirements: 3.1 (component architecture), 6.2 (show all teams), 6.3 (hide non-matching teams)
 */

interface TeamGroupProps {
  team: Team;
  children: React.ReactNode;
}

export default function TeamGroup({ team, children }: TeamGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  const teamClass = `team-group-${team.toLowerCase()}`;

  return (
    <div
      className={`team-group ${teamClass}`}
      data-team={team}
      role="rowgroup"
      aria-label={`Team ${team}`}
    >
      {/* Team Header */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-expanded={!collapsed}
        aria-controls={`team-group-content-${team.toLowerCase()}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "6px 12px",
          border: "none",
          borderBottom: "1px solid var(--color-border, #e2e8f0)",
          background: "var(--color-indigo-50, #f8fafc)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-indigo-900, #1e293b)",
          textAlign: "left",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            display: "inline-block",
            transition: "transform 150ms ease",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            fontSize: 10,
          }}
          aria-hidden="true"
        >
          ▼
        </span>
        {team}
      </button>

      {/* Collapsible Content */}
      <div
        id={`team-group-content-${team.toLowerCase()}`}
        role="group"
        style={{
          display: collapsed ? "none" : "block",
        }}
      >
        {children}
      </div>
    </div>
  );
}
