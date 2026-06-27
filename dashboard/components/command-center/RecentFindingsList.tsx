import React from "react";

/**
 * A single recent finding entry with severity and title.
 */
export interface RecentFinding {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
}

interface RecentFindingsListProps {
  findings: RecentFinding[];
}

/**
 * Returns the badge background color CSS custom property for a finding severity.
 *
 * - critical → coral (danger)
 * - warning → amber (warning)
 * - info → slate/blue (secondary)
 */
function getBadgeColor(severity: RecentFinding["severity"]): string {
  switch (severity) {
    case "critical":
      return "var(--color-status-danger)";
    case "warning":
      return "var(--color-status-warning)";
    case "info":
      return "var(--color-text-secondary)";
  }
}

/**
 * Displays a simplified list of recent findings with severity badges and titles.
 *
 * Each item shows a pill-shaped severity badge (color-coded) and the finding title.
 * Renders an empty state message when no findings are provided.
 *
 * Validates: Requirements 7.2
 */
export default function RecentFindingsList({ findings }: RecentFindingsListProps) {
  if (findings.length === 0) {
    return (
      <div
        className="p-4"
        style={{
          boxShadow: "var(--shadow-card)",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "var(--color-surface, #ffffff)",
        }}
      >
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: "var(--color-text-primary)" }}
        >
          Recent findings
        </h3>
        <p
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          No recent findings
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-4"
      style={{
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-lg)",
        backgroundColor: "var(--color-surface, #ffffff)",
      }}
    >
      <h3
        className="text-sm font-semibold mb-3"
        style={{ color: "var(--color-text-primary)" }}
      >
        Recent findings
      </h3>
      <ul className="flex flex-col gap-2">
        {findings.map((finding) => (
          <li key={finding.id} className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap"
              style={{
                backgroundColor: getBadgeColor(finding.severity),
                borderRadius: "var(--radius-pill)",
              }}
            >
              {finding.severity}
            </span>
            <span
              className="text-sm truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {finding.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
