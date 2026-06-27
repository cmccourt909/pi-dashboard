/**
 * Server-side KPI derivation logic for Command Center V2.
 *
 * Computes overview KPI values from PI and findings API data.
 * This is a pure function with no React or client-side dependencies.
 */

import type { OverviewKPIs } from "./types";

/** Shape of sprint data from /api/pis response. */
export interface SprintData {
  jira_id: number;
  name: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  total_issues: number;
  done_issues: number;
  blocked_issues: number;
  pct_complete: number;
}

/** Shape of PI data from /api/pis response. */
export interface PIData {
  name: string;
  start_date: string | null;
  end_date: string | null;
  total_issues: number;
  done_issues: number;
  blocked_issues: number;
  pct_complete: number;
  critical_findings: number;
  health: string;
  sprints: SprintData[];
}

/** Shape of a finding from /api/findings response. */
export interface Finding {
  rule_id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  recommendation: string;
  issue_keys: string[];
}

/** Default threshold for considering a feature "on track" (percentage). */
const ON_TRACK_THRESHOLD = 70;

/**
 * Derives overview KPI metrics from PI and findings API data.
 *
 * Handles null/undefined inputs gracefully with fallback zero values.
 *
 * @param piData - The current PI data object (or null/undefined)
 * @param findings - Array of findings (or null/undefined)
 * @param forecastConfidence - Optional Monte Carlo P50 percentage from forecast engine
 * @returns OverviewKPIs object with all five KPI metrics
 */
export function deriveOverviewKPIs(
  piData: PIData | null | undefined,
  findings: Finding[] | null | undefined,
  forecastConfidence?: number | null,
): OverviewKPIs {
  return {
    sprintVelocity: deriveSprintVelocity(piData),
    featuresOnTrack: deriveFeaturesOnTrack(piData),
    activeBlockers: deriveActiveBlockers(findings),
    daysRemaining: deriveDaysRemaining(piData),
    forecastConfidence: deriveForecastConfidence(forecastConfidence),
  };
}

/**
 * Computes sprint velocity from the active sprint in PI data.
 *
 * Velocity = done_issues in the active sprint.
 * Delta = done_issues - total_issues (negative means behind plan).
 */
function deriveSprintVelocity(
  piData: PIData | null | undefined,
): OverviewKPIs["sprintVelocity"] {
  if (!piData?.sprints?.length) {
    return { value: 0, delta: 0 };
  }

  const activeSprint = piData.sprints.find((s) => s.state === "active");
  if (!activeSprint) {
    return { value: 0, delta: 0 };
  }

  const value = activeSprint.done_issues ?? 0;
  const planned = activeSprint.total_issues ?? 0;
  const delta = planned > 0 ? value - planned : 0;

  return { value, delta };
}

/**
 * Computes features on track from PI sprint data.
 *
 * A sprint is considered "on track" when its pct_complete >= ON_TRACK_THRESHOLD.
 * Total is the number of sprints. Delta is the difference between on-track count
 * and half of total (positive = better than expected).
 */
function deriveFeaturesOnTrack(
  piData: PIData | null | undefined,
): OverviewKPIs["featuresOnTrack"] {
  if (!piData?.sprints?.length) {
    return { onTrack: 0, total: 0, delta: 0 };
  }

  const sprints = piData.sprints;
  const total = sprints.length;
  const onTrack = sprints.filter(
    (s) => (s.pct_complete ?? 0) >= ON_TRACK_THRESHOLD,
  ).length;

  // Delta compares on-track count to half of total (baseline expectation)
  const baseline = Math.ceil(total / 2);
  const delta = onTrack - baseline;

  return { onTrack, total, delta };
}

/**
 * Computes active blockers from findings data.
 *
 * Active blockers = count of findings with severity "critical".
 * Delta is computed as negative of count (more blockers = worse).
 */
function deriveActiveBlockers(
  findings: Finding[] | null | undefined,
): OverviewKPIs["activeBlockers"] {
  if (!findings?.length) {
    return { count: 0, delta: 0 };
  }

  const criticalFindings = findings.filter((f) => f.severity === "critical");
  const count = criticalFindings.length;
  // Negative delta: more blockers is worse
  const delta = count > 0 ? -count : 0;

  return { count, delta };
}

/**
 * Computes days remaining until PI end date.
 *
 * Uses the PI end_date to calculate the difference from today.
 * Returns 0 if end_date is null, missing, or in the past.
 */
function deriveDaysRemaining(
  piData: PIData | null | undefined,
): OverviewKPIs["daysRemaining"] {
  if (!piData?.end_date) {
    return { days: 0, endDate: "" };
  }

  // Parse end_date as local date components to avoid UTC offset issues
  const endParts = piData.end_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!endParts) {
    return { days: 0, endDate: "" };
  }

  const endDate = new Date(
    parseInt(endParts[1], 10),
    parseInt(endParts[2], 10) - 1,
    parseInt(endParts[3], 10),
  );
  if (isNaN(endDate.getTime())) {
    return { days: 0, endDate: "" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const diffMs = endDate.getTime() - today.getTime();
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return { days, endDate: piData.end_date };
}

/**
 * Wraps the forecast confidence value (Monte Carlo P50 percentage).
 *
 * Returns the provided value or 0 if not available.
 */
function deriveForecastConfidence(
  forecastConfidence?: number | null,
): OverviewKPIs["forecastConfidence"] {
  if (forecastConfidence == null || isNaN(forecastConfidence)) {
    return { percentage: 0 };
  }

  return { percentage: Math.max(0, Math.min(100, forecastConfidence)) };
}
