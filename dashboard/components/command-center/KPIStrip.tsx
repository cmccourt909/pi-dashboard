import React from "react";
import KPICard from "./KPICard";
import { KPIMetric } from "./types";

interface KPIStripProps {
  metrics: KPIMetric[];
}

/**
 * Horizontal row of 5 KPI metric cards.
 *
 * Renders each metric as a KPICard with labels: Sprint velocity,
 * Features on track, Active blockers, Days remaining, Forecast confidence.
 *
 * Responsive behavior:
 * - >= 768px: single row of 5 equal-width cards
 * - < 768px: wraps into a 2-column grid
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.2
 */
export default function KPIStrip({ metrics }: KPIStripProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {metrics.map((metric) => (
        <KPICard key={metric.label} metric={metric} />
      ))}
    </div>
  );
}
