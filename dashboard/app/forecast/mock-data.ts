/**
 * Mock/fallback data for the Forecast page when API is unreachable.
 * Shaped to match FastAPI schemas (app/api/schemas.py).
 */
import type { APIPIData, APIRoadmapResponse } from "./types";

export const MOCK_PIS: APIPIData[] = [
  {
    name: "26.1", start_date: "2026-01-05", end_date: "2026-03-06",
    total_issues: 62, done_issues: 58, blocked_issues: 0, pct_complete: 93.5,
    critical_findings: 0, health: "green",
    sprints: [
      { jira_id: 1, name: "Sprint 26.1.1", state: "closed", start_date: "2026-01-05", end_date: "2026-01-23", total_issues: 18, done_issues: 16, blocked_issues: 0, pct_complete: 88.9 },
      { jira_id: 2, name: "Sprint 26.1.2", state: "closed", start_date: "2026-01-26", end_date: "2026-02-13", total_issues: 20, done_issues: 18, blocked_issues: 0, pct_complete: 90.0 },
      { jira_id: 3, name: "Sprint 26.1.3", state: "closed", start_date: "2026-02-16", end_date: "2026-03-06", total_issues: 24, done_issues: 24, blocked_issues: 0, pct_complete: 100.0 },
    ],
  },
  {
    name: "26.2", start_date: "2026-03-09", end_date: "2026-06-19",
    total_issues: 76, done_issues: 31, blocked_issues: 2, pct_complete: 40.8,
    critical_findings: 1, health: "amber",
    sprints: [
      { jira_id: 4, name: "Sprint 26.2.1", state: "closed", start_date: "2026-03-09", end_date: "2026-03-27", total_issues: 22, done_issues: 19, blocked_issues: 0, pct_complete: 86.4 },
      { jira_id: 5, name: "Sprint 26.2.2", state: "closed", start_date: "2026-03-30", end_date: "2026-04-17", total_issues: 24, done_issues: 20, blocked_issues: 1, pct_complete: 83.3 },
      { jira_id: 6, name: "Sprint 26.2.3", state: "active", start_date: "2026-04-20", end_date: "2026-05-08", total_issues: 30, done_issues: 12, blocked_issues: 1, pct_complete: 40.0 },
      { jira_id: 7, name: "Sprint 26.2.4", state: "future", start_date: "2026-05-11", end_date: "2026-05-29", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0 },
      { jira_id: 8, name: "Sprint 26.2.5", state: "future", start_date: "2026-06-01", end_date: "2026-06-19", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0 },
    ],
  },
  { name: "26.3", start_date: "2026-06-22", end_date: "2026-09-11", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0, critical_findings: 0, health: "green", sprints: [] },
  { name: "26.4", start_date: "2026-09-14", end_date: "2026-12-04", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0, critical_findings: 0, health: "green", sprints: [] },
  { name: "26.5", start_date: "2026-12-07", end_date: "2027-02-26", total_issues: 0, done_issues: 0, blocked_issues: 0, pct_complete: 0, critical_findings: 0, health: "green", sprints: [] },
];

export const MOCK_ROADMAP: APIRoadmapResponse = {
  features: [
    { issue_key: "EVIONEP-1770", summary: "Historical Data Handling - Isaac SQL", status: "Implementing", status_category: "indeterminate", assignee: "R. Sharma", target_start_date: "2026-01-05", target_end_date: "2026-05-29", story_total: 10, story_done: 8, story_in_progress: 1, story_todo: 1, pct_complete: 80.0 },
    { issue_key: "EVIONEP-1774", summary: "ISAAC SQL - Case Details (SOID)", status: "In Progress", status_category: "indeterminate", assignee: "M. Patel", target_start_date: "2026-02-01", target_end_date: "2026-06-12", story_total: 9, story_done: 5, story_in_progress: 2, story_todo: 2, pct_complete: 55.6 },
    { issue_key: "EVCOTSU-1034", summary: "Site of Care (SoC) - Widget & Workflow", status: "Blocked", status_category: "indeterminate", assignee: "J. Shingre", target_start_date: "2026-02-16", target_end_date: "2026-05-22", story_total: 8, story_done: 2, story_in_progress: 0, story_todo: 6, pct_complete: 25.0 },
    { issue_key: "EVEXPNR-762", summary: "Program Specific Rules - MSK Pain & Joint", status: "Working", status_category: "indeterminate", assignee: "B. Patil", target_start_date: "2026-03-09", target_end_date: "2026-06-05", story_total: 7, story_done: 4, story_in_progress: 1, story_todo: 2, pct_complete: 57.1 },
    { issue_key: "EVCOTSU-HC", summary: "Health Plan Config Chain", status: "In Development", status_category: "indeterminate", assignee: "S. Patil", target_start_date: "2026-01-26", target_end_date: "2026-05-15", story_total: 9, story_done: 7, story_in_progress: 1, story_todo: 1, pct_complete: 77.8 },
    { issue_key: "EVCOISC-183", summary: "ABH AZ - Data Elements for Letter Gen", status: "To Do", status_category: "new", assignee: "Unassigned", target_start_date: "2026-03-09", target_end_date: "2026-06-19", story_total: 4, story_done: 0, story_in_progress: 0, story_todo: 4, pct_complete: 0.0 },
    { issue_key: "EVEXPNR-754", summary: "CAR/RAD/MSK - Member Eligibility Messaging", status: "Ready for QA", status_category: "indeterminate", assignee: "T. Kumar", target_start_date: "2026-02-16", target_end_date: "2026-05-08", story_total: 7, story_done: 6, story_in_progress: 1, story_todo: 0, pct_complete: 85.7 },
  ],
  pis: [],
  sprints: [],
};
