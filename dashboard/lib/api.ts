export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

export interface Finding {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  affected_entity: string;
  entity_type: string;
  recommendation: string;
  metric_value: number | null;
  metric_threshold: number | null;
}

async function fetchJSON(path: string) {
  const res = await fetch(API_BASE + path, { cache: "no-store" });
  if (!res.ok) throw new Error("API error " + res.status);
  return res.json();
}

export const api = {
  getPIs: () => fetchJSON("/api/pis"),
  getFeatures: () => fetchJSON("/api/features"),
  getFindings: () => fetchJSON("/api/findings"),
};

export function healthToStatus(health: string) {
  if (health === "green") return "healthy" as const;
  if (health === "red") return "critical" as const;
  if (health === "yellow") return "warning" as const;
  return "unknown" as const;
}