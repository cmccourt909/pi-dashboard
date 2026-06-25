"use client";

/**
 * SummaryStrip displays 5 KPI stat cells in a horizontal row above the Gantt chart.
 * Each cell shows a label and a count value for key program health metrics.
 *
 * The component receives a pre-filtered features array — the parent (RoadmapPage)
 * is responsible for filtering before passing features here.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 6.5
 */

import { FeatureItem, KPISummary } from "@/types/roadmap";

interface SummaryStripProps {
  features: FeatureItem[];
}

/**
 * Pure utility function to compute KPI metrics from a set of features.
 * Exported for independent testing (property-based tests).
 *
 * - total_features: count of features in the set
 * - on_track: features where rag_status === "green"
 * - at_risk: features where rag_status === "amber" OR "red"
 * - total_stories: sum of all pi_completion[].story_count across features
 * - blocked: features where is_blocked_by.length > 0
 */
export function computeKPIs(features: FeatureItem[]): KPISummary {
  let on_track = 0;
  let at_risk = 0;
  let total_stories = 0;
  let blocked = 0;

  for (const feature of features) {
    if (feature.rag_status === "green") {
      on_track++;
    } else {
      at_risk++;
    }

    for (const pi of feature.pi_completion) {
      total_stories += pi.story_count;
    }

    if (feature.is_blocked_by.length > 0) {
      blocked++;
    }
  }

  return {
    total_features: features.length,
    on_track,
    at_risk,
    total_stories,
    blocked,
  };
}

interface KPICell {
  label: string;
  value: number;
  variant?: "default" | "at-risk" | "blocked";
}

export default function SummaryStrip({ features }: SummaryStripProps) {
  const kpis = computeKPIs(features);

  const cells: KPICell[] = [
    { label: "Total Features", value: kpis.total_features },
    { label: "On Track", value: kpis.on_track },
    { label: "At Risk", value: kpis.at_risk, variant: "at-risk" },
    { label: "Total Stories", value: kpis.total_stories },
    { label: "Blocked", value: kpis.blocked, variant: "blocked" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border, #e2e8f0)",
        background: "var(--color-indigo-50, #f8fafc)",
      }}
      role="region"
      aria-label="Program KPI summary"
    >
      {cells.map((cell) => (
        <div
          key={cell.label}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 16px",
            borderRadius: 6,
            minWidth: 100,
            background: getBackground(cell.variant),
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.2,
              color: getValueColor(cell.variant),
            }}
          >
            {cell.value}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: getLabelColor(cell.variant),
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginTop: 2,
            }}
          >
            {cell.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function getBackground(variant?: "default" | "at-risk" | "blocked"): string {
  switch (variant) {
    case "at-risk":
      return "rgba(245, 158, 11, 0.08)";
    case "blocked":
      return "rgba(239, 68, 68, 0.08)";
    default:
      return "#fff";
  }
}

function getValueColor(variant?: "default" | "at-risk" | "blocked"): string {
  switch (variant) {
    case "at-risk":
      return "#b45309";
    case "blocked":
      return "#dc2626";
    default:
      return "var(--color-indigo-900, #1e293b)";
  }
}

function getLabelColor(variant?: "default" | "at-risk" | "blocked"): string {
  switch (variant) {
    case "at-risk":
      return "#92400e";
    case "blocked":
      return "#991b1b";
    default:
      return "var(--color-text-muted, #64748b)";
  }
}
