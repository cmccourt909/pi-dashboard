"use client";

import { useState, useMemo } from "react";

export type FindingSeverity = "critical" | "warning" | "info";

export interface Finding {
  id: string;
  severity: FindingSeverity;
  feature: string;
  message: string;
}

export interface TopFindingsProps {
  findings?: Finding[];
  title?: string;
}

const DEFAULT_FINDINGS: Finding[] = [
  {
    id: "1",
    severity: "critical",
    feature: "FEAT-12",
    message: "Cross-team blocker with Team Bravo unresolved for 3 days",
  },
  {
    id: "2",
    severity: "warning",
    feature: "FEAT-08",
    message: "Scope increased mid-sprint; risk of PI commitment slip",
  },
  {
    id: "3",
    severity: "critical",
    feature: "FEAT-03",
    message: "No assigned owner; delivery date undefined",
  },
  {
    id: "4",
    severity: "info",
    feature: "FEAT-21",
    message: "Dependency review scheduled for next sprint",
  },
];

const SEVERITY_ORDER: FindingSeverity[] = ["critical", "warning", "info"];

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

const SEVERITY_COLOR: Record<FindingSeverity, string> = {
  critical: "var(--color-status-danger)",
  warning: "var(--color-status-warning)",
  info: "var(--color-interactive-secondary)",
};

/**
 * TopFindings is a critical-first filtered list for mobile.
 *
 * Spec: Wave 4.5
 * - Critical-first sorting
 * - "All N ↓" filter dropdown
 */
export default function TopFindings({
  findings = DEFAULT_FINDINGS,
  title = "Top Findings",
}: TopFindingsProps) {
  const [filter, setFilter] = useState<FindingSeverity | "all">("all");

  const filtered = useMemo(() => {
    let list = [...findings].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    );
    if (filter !== "all") {
      list = list.filter((f) => f.severity === filter);
    }
    return list;
  }, [findings, filter]);

  return (
    <div
      data-testid="top-findings"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-4)",
        }}
      >
        <h3
          style={{
            fontSize: "var(--font-size-body)",
            fontWeight: "var(--font-weight-semi)",
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          {title}
        </h3>
        <select
          data-testid="findings-filter"
          aria-label="Filter findings by severity"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FindingSeverity | "all")}
          style={{
            minHeight: 44,
            padding: "var(--space-1) var(--space-2)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-card)",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-caption)",
          }}
        >
          <option value="all">All {findings.length} ↓</option>
          {SEVERITY_ORDER.map((severity) => (
            <option key={severity} value={severity}>
              {SEVERITY_LABEL[severity]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {filtered.map((finding) => (
          <div
            key={finding.id}
            data-testid={`finding-${finding.id}`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              paddingBottom: "var(--space-3)",
              borderBottom: "1px solid var(--color-border-default)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: SEVERITY_COLOR[finding.severity],
                }}
              />
              <span
                style={{
                  fontSize: "var(--font-size-caption)",
                  fontWeight: "var(--font-weight-semi)",
                  color: SEVERITY_COLOR[finding.severity],
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {SEVERITY_LABEL[finding.severity]}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-caption)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {finding.feature}
              </span>
            </div>
            <p
              style={{
                fontSize: "var(--font-size-body)",
                color: "var(--color-text-primary)",
                margin: 0,
                lineHeight: "var(--line-height-snug)",
              }}
            >
              {finding.message}
            </p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p
            style={{
              fontSize: "var(--font-size-body)",
              color: "var(--color-text-tertiary)",
              margin: 0,
            }}
          >
            No findings match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
