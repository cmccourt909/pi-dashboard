/**
 * Forecast page types — matches FastAPI Pydantic schemas (app/api/schemas.py)
 */

// ─── API Response Types ─────────────────────────────────────────────────────

export interface APISprintData {
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

export interface APIPIData {
  name: string;
  start_date: string;
  end_date: string;
  total_issues: number;
  done_issues: number;
  blocked_issues: number;
  pct_complete: number;
  critical_findings: number;
  health: string;
  sprints: APISprintData[];
}

export interface APIRoadmapFeature {
  issue_key: string;
  summary: string;
  status: string;
  status_category?: string;
  priority?: string | null;
  assignee: string | null;
  target_start_date: string | null;
  target_end_date: string | null;
  due_date?: string | null;
  story_total: number;
  story_done: number;
  story_in_progress: number;
  story_todo: number;
  pct_complete: number;
}

export interface APIRoadmapResponse {
  features: APIRoadmapFeature[];
  pis: { name: string; start: string; end: string }[];
  sprints: { name: string; start: string | null; end: string | null; pi: string | null }[];
}

export interface APIFeatureSummary {
  feature_key: string;
  feature_summary: string;
  total_stories: number;
  done_stories: number;
  blocked_stories: number;
  pct_complete: number;
  health: string;
  stories: APIFeatureStory[];
}

export interface APIFeatureStory {
  jira_key: string;
  summary: string;
  status: string;
  status_category: string;
  project_key: string;
  sprint_name: string | null;
  assignee: string | null;
  story_points: number | null;
  blocked: boolean;
}

// ─── Transformed Internal Types ─────────────────────────────────────────────

export interface TransformedSprint {
  name: string;
  start: string;
  end: string;
  state: "closed" | "active" | "future";
  total: number;
  done: number;
  pct: number;
}

export interface TransformedPI {
  name: string;
  start: string;
  end: string;
  health: string;
  issuesTotal: number;
  issuesDone: number;
  issuesBlocked: number;
  pctComplete: number;
  criticalFindings: number;
  sprints: TransformedSprint[];
}

export interface TransformedFeature {
  key: string;
  name: string;
  status: string;
  assignee: string;
  storiesTotal: number;
  storiesDone: number;
  pctComplete: number;
  plannedStart: string;
  plannedEnd: string;
  team: string;
}

export interface VelocityStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  unit: "SP" | "issues";
  source: "sprint-SP" | "PI-SP" | "PI-issues" | "default" | "manual-override";
  totalDone?: number;
  totalAll?: number;
}

export interface SprintTimelineEntry extends TransformedSprint {
  piName: string;
  label: string;
}

export interface SlipInfo {
  label: "Blocked" | "Overdue" | "Will Slip" | "At Risk" | "On Track";
  color: string;
  bg: string;
}

export interface ScoredFeature extends TransformedFeature {
  score: number;
  daysLeft: number;
  expectedPct: number;
  slip: SlipInfo;
}

export interface MonteCarloResult {
  p50End: string;
  p85End: string;
  slipDays: number;
}

export interface PIForecast extends TransformedPI {
  forecastStatus: string;
  forecastColor: string;
  mc: MonteCarloResult | null;
}

export interface VelocityChartPoint {
  name: string;
  actual: number | null;
  planned: number;
  projected: number | null;
}

export type ForecastTab = "overview" | "velocity" | "features";
export type SortMode = "slip" | "date" | "pct";
