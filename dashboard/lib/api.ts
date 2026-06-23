// Server-side uses BACKEND_URL (internal Docker network), client-side uses relative paths
function getApiBase(): string {
  if (typeof window === "undefined") {
    // Server-side: use internal Docker URL or fallback
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }
  // Client-side: use relative path (proxied by nginx or Next.js rewrites)
  return "";
}

export const API_BASE = getApiBase();

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
  rule_id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  recommendation: string;
  issue_keys: string[];
}

async function fetchJSON(path: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
  try {
    const res = await fetch(API_BASE + path, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("API error " + res.status);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  getPIs: () => fetchJSON("/api/pis"),
  getFeatures: () => fetchJSON("/api/features"),
  getFindings: () => fetchJSON("/api/findings"),
};

export function healthToStatus(health: string) {
  if (health === "green") return "healthy" as const;
  if (health === "red") return "critical" as const;
  if (health === "amber" || health === "yellow") return "warning" as const;
  return "unknown" as const;
}