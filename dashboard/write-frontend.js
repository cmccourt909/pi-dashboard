const fs = require('fs');

const api = `
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
  health: "green" | "red" | "yellow" | string;
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

export interface FeatureData {
  feature_key: string;
  feature_summary: string;
  total_stories: number;
  completed_stories: number;
  total_points: number;
  completed_points: number;
  completion_rate: number;
  health_score: number;
  status: string;
}

async function fetchJSON(path) {
  const res = await fetch(API_BASE + path, { cache: "no-store" });
  if (!res.ok) throw new Error("API error " + res.status + " for " + path);
  return res.json();
}

export const api = {
  getPIs: () => fetchJSON("/api/pis"),
  getFeatures: () => fetchJSON("/api/features"),
  getFindings: () => fetchJSON("/api/findings"),
};

export function healthToStatus(health) {
  if (health === "green") return "healthy";
  if (health === "red") return "critical";
  if (health === "yellow") return "warning";
  return "unknown";
}
`.trim();

const page = `
import { api, healthToStatus } from "@/lib/api";
import PICard from "@/components/PICard";

function SectionLabel({ children }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 4,
      }}
    >
      {children}
    </p>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontWeight: 700,
          color: accent ?? "var(--text-primary)",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function severityColor(s) {
  if (s === "critical") return "var(--status-critical)";
  if (s === "warning") return "var(--status-warning)";
  return "var(--accent)";
}

function FindingsPanel({ findings }) {
  const critical = findings.filter((f) => f.severity === "critical");
  const warning = findings.filter((f) => f.severity === "warning");
  const info = findings.filter((f) => f.severity === "info");

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>
          RISK FINDINGS
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { count: critical.length, color: "var(--status-critical)", label: "CRIT" },
            { count: warning.length, color: "var(--status-warning)", label: "WARN" },
            { count: info.length, color: "var(--accent)", label: "INFO" },
          ].map(({ count, color, label }) => (
            <span key={label} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color, fontWeight: 700, letterSpacing: "0.1em" }}>
              {count} {label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ maxHeight: 480, overflowY: "auto" }}>
        {findings.map((f, i) => (
          <div
            key={f.id ?? i}
            style={{
              padding: "14px 20px",
              borderBottom: i < findings.length - 1 ? "1px solid var(--border)" : "none",
              borderLeft: "3px solid " + severityColor(f.severity),
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: severityColor(f.severity), textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {f.severity}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                {f.category}
              </span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
              {f.title}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {f.description}
            </p>
            <p style={{ fontSize: 11, color: "var(--status-warning)", marginTop: 6 }}>
              {"\u2192"} {f.recommendation}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
              {f.affected_entity}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  let pis = [];
  let findings = [];
  let error = null;

  try {
    [pis, findings] = await Promise.all([api.getPIs(), api.getFindings()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  const totalIssues = pis.reduce((s, p) => s + (p.total_issues || 0), 0);
  const avgHealth = pis.length > 0
    ? Math.round(pis.reduce((s, p) => s + (p.pct_complete || 0), 0) / pis.length)
    : 0;
  const critCount = findings.filter((f) => f.severity === "critical").length;

  return (
    <>
      <div
        style={{
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: 6 }}>
            PROGRAM INCREMENT OVERVIEW
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
            PI HEALTH TRACKER
          </h1>
        </div>
        <div style={{ display: "flex", gap: 40, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 4, padding: "16px 28px" }}>
          <Stat label="PIs" value={pis.length} />
          <Stat label="Issues" value={totalIssues} />
          <Stat label="Avg Complete" value={avgHealth + "%"} accent={avgHealth >= 75 ? "var(--status-healthy)" : avgHealth >= 50 ? "var(--status-warning)" : "var(--status-critical)"} />
          <Stat label="Critical" value={critCount} accent={critCount > 0 ? "var(--status-critical)" : undefined} />
        </div>
      </div>

      {error && (
        <div style={{ background: "color-mix(in srgb, var(--status-critical) 10%, transparent)", border: "1px solid var(--status-critical)", borderRadius: 4, padding: "12px 20px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--status-critical)", marginBottom: 24 }}>
          {"\u26a0"} API error: {error}. Make sure the FastAPI backend is running on port 8000.
        </div>
      )}

      <div style={