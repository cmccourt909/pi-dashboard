"use client";

import { IconSparkles, IconRefresh } from "@tabler/icons-react";

export interface Insight {
  id: string;
  text: string;
}

export interface NorthlineInsightsStripProps {
  insights?: Insight[];
  onRefresh?: () => void;
  onViewFindings?: () => void;
}

const DEFAULT_INSIGHTS: Insight[] = [
  {
    id: "1",
    text: "2 features are at risk of missing the PI 26.3 commitment due to unresolved cross-team dependencies.",
  },
  {
    id: "2",
    text: "Team Bravo's sprint velocity is 15% above forecast — consider pulling forward 1 feature from the backlog.",
  },
  {
    id: "3",
    text: "1 new critical finding was identified today in the sync pipeline and requires PM review.",
  },
];

/**
 * NorthlineInsightsStrip displays 3 AI-generated bullet points on the Overview.
 *
 * Spec: Wave 4.2
 * - 3 AI bullet points
 * - Static narrative, refreshed on load or manual refresh
 * - "View findings →" link
 */
export default function NorthlineInsightsStrip({
  insights = DEFAULT_INSIGHTS,
  onRefresh,
  onViewFindings,
}: NorthlineInsightsStripProps) {
  return (
    <div
      data-testid="northline-insights-strip"
      style={{
        background: "var(--color-fill-neutral)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <IconSparkles size={18} stroke={1.5} color="var(--color-interactive-primary)" />
          <h3
            style={{
              fontSize: "var(--font-size-body)",
              fontWeight: "var(--font-weight-semi)",
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Lodestar Insights
          </h3>
        </div>
        <button
          type="button"
          data-testid="insights-refresh"
          aria-label="Refresh insights"
          onClick={onRefresh}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            minHeight: 44,
            padding: "var(--space-1) var(--space-2)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-card)",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-caption)",
            cursor: "pointer",
          }}
        >
          <IconRefresh size={14} stroke={1.5} />
          <span>Refresh</span>
        </button>
      </div>

      <ul
        style={{
          margin: 0,
          padding: 0,
          paddingLeft: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {insights.map((insight) => (
          <li
            key={insight.id}
            data-testid={`insight-${insight.id}`}
            style={{
              fontSize: "var(--font-size-body)",
              lineHeight: "var(--line-height-normal)",
              color: "var(--color-text-primary)",
            }}
          >
            {insight.text}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "var(--space-3)" }}>
        <button
          type="button"
          data-testid="view-findings"
          onClick={onViewFindings}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: "var(--color-interactive-primary)",
            fontSize: "var(--font-size-body)",
            fontWeight: "var(--font-weight-medium)",
            cursor: "pointer",
          }}
        >
          View findings →
        </button>
      </div>
    </div>
  );
}
