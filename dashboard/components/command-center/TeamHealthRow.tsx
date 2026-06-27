import React from "react";
import { TeamHealth } from "./types";
import { getHealthColor } from "./utils";

interface TeamHealthRowProps {
  team: TeamHealth;
}

/**
 * A single team health row displaying team name and a colored status indicator.
 *
 * - Healthy teams show a teal dot
 * - At-risk teams show an amber dot
 * - Critical teams show a coral dot with visual emphasis (bold text + coral left border)
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */
export default function TeamHealthRow({ team }: TeamHealthRowProps) {
  const { name, status } = team;
  const isCritical = status === "critical";
  const statusColor = getHealthColor(status);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md ${
        isCritical ? "font-bold" : ""
      }`}
      style={{
        borderLeft: isCritical ? `3px solid ${statusColor}` : "3px solid transparent",
        backgroundColor: isCritical ? "var(--color-status-danger-tint, rgba(239, 68, 68, 0.06))" : "transparent",
      }}
    >
      {/* Status indicator dot */}
      <span
        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: statusColor }}
        aria-hidden="true"
      />

      {/* Team name */}
      <span
        className="text-sm truncate"
        style={{ color: "var(--color-text-primary)" }}
      >
        {name}
      </span>

      {/* Accessible status label */}
      <span className="sr-only">{status}</span>
    </div>
  );
}
