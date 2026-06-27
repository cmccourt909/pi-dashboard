/**
 * Shared TypeScript interfaces for Command Center V2 components.
 *
 * These types define the data contracts used across the overview page,
 * including KPI metrics, findings, team health, navigation, and derived view models.
 */

/** A single KPI metric card displayed in the KPI strip. */
export interface KPIMetric {
  label: string;
  value: string | number;
  /** Positive = improving, negative = worsening */
  delta?: number;
  /** E.g., "Monte Carlo P50" or PI end date */
  subtitle?: string;
}

/** A finding that requires attention, displayed in the Needs Attention section. */
export interface AttentionFinding {
  id: string;
  severity: "critical" | "warning";
  title: string;
  description: string;
  recommendation: string;
  category: string;
}

/** Team health indicator for the PI Health section. */
export interface TeamHealth {
  name: string;
  status: "healthy" | "at-risk" | "critical";
  completionPct: number;
}

/** A navigation card used in the Quick Navigation grid. */
export interface NavCard {
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType;
}

/** Server-derived KPI values computed from PI and findings API data. */
export interface OverviewKPIs {
  sprintVelocity: { value: number; delta: number };
  featuresOnTrack: { onTrack: number; total: number; delta: number };
  activeBlockers: { count: number; delta: number };
  daysRemaining: { days: number; endDate: string };
  forecastConfidence: { percentage: number };
}

/** Derived team health status computed from sprint/PI data. */
export interface DerivedTeamHealth {
  name: string;
  status: "healthy" | "at-risk" | "critical";
  completionPct: number;
}
