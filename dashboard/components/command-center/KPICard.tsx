import React from "react";
import { KPIMetric } from "./types";
import { getDeltaColor } from "./utils";

interface KPICardProps {
  metric: KPIMetric;
}

/**
 * A single KPI metric card displaying label, value, delta, and optional subtitle.
 *
 * Delta values are color-coded using getDeltaColor:
 * - Positive (improving) → teal
 * - Negative (worsening) → coral
 * - Zero → neutral
 *
 * Validates: Requirements 4.7, 4.8, 8.2
 */
export default function KPICard({ metric }: KPICardProps) {
  const { label, value, delta, subtitle } = metric;

  const formatDelta = (d: number): string => {
    if (d > 0) return `+${d}`;
    return `${d}`;
  };

  return (
    <div
      className="flex flex-col justify-between p-4 min-w-0"
      style={{
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--color-surface, #ffffff)",
      }}
    >
      <span
        className="text-sm font-medium truncate"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </span>

      <span
        className="text-2xl font-bold mt-2"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </span>

      <div className="flex items-center gap-2 mt-2">
        {delta !== undefined && (
          <span
            className="text-sm font-medium"
            style={{ color: getDeltaColor(delta) }}
          >
            {formatDelta(delta)}
          </span>
        )}

        {subtitle && (
          <span
            className="text-xs truncate"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
