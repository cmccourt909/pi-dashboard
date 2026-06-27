/**
 * Pure utility functions for Command Center V2.
 *
 * These functions handle color mapping, severity sorting, and team health
 * derivation. They are side-effect-free and tested via property-based tests.
 */

/**
 * Returns the appropriate CSS custom property color for a KPI delta value.
 *
 * - Positive delta (improving) → teal (success)
 * - Negative delta (worsening) → coral (danger)
 * - Zero delta → neutral secondary text
 *
 * Validates: Requirements 4.7, 4.8
 */
export function getDeltaColor(delta: number): string {
  if (delta > 0) return "var(--color-status-success)";
  if (delta < 0) return "var(--color-status-danger)";
  return "var(--color-text-secondary)";
}

/** Severity ordering: lower number = higher priority. */
export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/**
 * Sorts an array of findings by severity (critical first, then warning, then info).
 * Returns a new array without mutating the original.
 * Preserves relative order within each severity level (stable sort).
 *
 * Validates: Requirements 5.2
 */
export function sortBySeverity<T extends { severity: string }>(findings: T[]): T[] {
  return [...findings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
  );
}

/**
 * Derives a team health status from completion percentage and blocker state.
 *
 * - Critical: has a blocker OR completion < 30%
 * - At-risk: completion < 60%
 * - Healthy: completion >= 60% with no blockers
 *
 * Validates: Requirements 6.3
 */
export function deriveTeamStatus(
  completionPct: number,
  hasBlocker: boolean
): "healthy" | "at-risk" | "critical" {
  if (hasBlocker || completionPct < 30) return "critical";
  if (completionPct < 60) return "at-risk";
  return "healthy";
}

/**
 * Returns the CSS custom property color for a given health status.
 *
 * - Healthy → teal (success)
 * - At-risk → amber (warning)
 * - Critical → coral (danger)
 *
 * Validates: Requirements 6.3
 */
export function getHealthColor(status: "healthy" | "at-risk" | "critical"): string {
  if (status === "healthy") return "var(--color-status-success)";
  if (status === "at-risk") return "var(--color-status-warning)";
  return "var(--color-status-danger)";
}
