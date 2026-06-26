import { api, healthToStatus } from "@/lib/api";
import PICard from "@/components/PICard";
import AskLodestar from "@/components/AskLodestar";
import NorthlineInsightsStrip from "@/components/NorthlineInsightsStrip";
import LodestarBriefingPanel from "@/components/LodestarBriefingPanel";
import RecentActivityFeed from "@/components/RecentActivityFeed";
import TopFindings from "@/components/TopFindings";

function severityColor(s: string) {
  if (s === "critical") return "var(--color-status-danger)";
  if (s === "warning") return "var(--color-status-warning)";
  return "var(--color-interactive-primary)";
}

function severityBg(s: string) {
  if (s === "critical") return "var(--color-fill-danger)";
  if (s === "warning") return "var(--color-fill-warning)";
  return "var(--color-fill-info)";
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: "var(--color-surface-card)",
      border: "0.5px solid var(--color-border-default)",
      borderRadius: "var(--radius-md)",
      padding: "var(--space-4) var(--space-4)",
    }}>
      <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
        {label}
      </p>
      <p style={{
        fontSize: "var(--font-size-h2)",
        fontWeight: "var(--font-weight-semi)",
        color: color ?? "var(--color-text-primary)",
        lineHeight: 1,
        fontFeatureSettings: '"tnum" 1',
      }}>
        {value}
      </p>
    </div>
  );
}

function FindingsPanel({ findings }: { findings: any[] }) {
  const critical = findings.filter((f) => f.severity === "critical");
  const warning = findings.filter((f) => f.severity === "warning");
  const info = findings.filter((f) => f.severity === "info");

  return (
    <div
      role="region"
      aria-label="Risk findings"
      style={{ background: "var(--color-surface-card)", border: "0.5px solid var(--color-border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "0.5px solid var(--color-border-default)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-primary)" }}>Findings</span>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { count: critical.length, color: "var(--color-status-danger)", label: "critical" },
            { count: warning.length, color: "var(--color-status-warning)", label: "warn" },
            { count: info.length, color: "var(--color-interactive-primary)", label: "info" },
          ].map(({ count, color, label }) => (
            <span key={label} style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", color }}>
              {count} {label}
            </span>
          ))}
        </div>
      </div>

      {/* Finding rows */}
      <div style={{ maxHeight: 560, overflowY: "auto" }}>
        {findings.map((f, i) => (
          <div
            key={f.rule_id ?? i}
            style={{
              padding: "10px var(--space-4)",
              borderBottom: i < findings.length - 1 ? "0.5px solid var(--color-border-default)" : "none",
              borderLeft: `2.5px solid ${severityColor(f.severity)}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: "var(--font-size-label)",
                fontWeight: "var(--font-weight-medium)",
                color: severityColor(f.severity),
                background: severityBg(f.severity),
                padding: "1px 8px",
                borderRadius: "var(--radius-pill)",
              }}>
                {f.severity}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)" }}>
                {f.category}
              </span>
            </div>
            <p style={{ fontSize: "var(--font-size-body)", fontWeight: "var(--font-weight-semi)", color: "var(--color-text-primary)", marginBottom: 2 }}>
              {f.title}
            </p>
            <p style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-normal)" }}>
              {f.detail}
            </p>
            {f.recommendation && (
              <p style={{ fontSize: "var(--font-size-caption)", color: "var(--color-interactive-primary)", marginTop: 4 }}>
                → {f.recommendation}
              </p>
            )}
            {f.issue_keys?.length > 0 && (
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {f.issue_keys.slice(0, 5).map((key: string) => (
                  <span key={key} style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--font-size-caption)",
                    background: "var(--color-fill-neutral)",
                    color: "var(--color-interactive-primary)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                  }}>
                    {key}
                  </span>
                ))}
                {f.issue_keys.length > 5 && (
                  <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)" }}>+{f.issue_keys.length - 5} more</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  let pis: any[] = [];
  let findings: any[] = [];
  let error: string | null = null;
  try {
    [pis, findings] = await Promise.all([api.getPIs(), api.getFindings()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  const totalIssues = pis.reduce((s, p) => s + (p.total_issues || 0), 0);
  const avgComplete = pis.length > 0 ? Math.round(pis.reduce((s, p) => s + (p.pct_complete || 0), 0) / pis.length) : 0;
  const critCount = findings.filter((f) => f.severity === "critical").length;

  // Empty state
  if (!error && pis.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ marginBottom: "var(--space-4)", color: "var(--color-brand-slate)" }}>
          <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 15v2a4 4 0 004 4h10a4 4 0 004-4v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <h2 style={{ marginBottom: "var(--space-2)", color: "var(--color-text-primary)" }}>No data yet</h2>
        <p style={{ marginBottom: "var(--space-5)", color: "var(--color-text-secondary)" }}>Upload a Jira CSV or XLSX to get started.</p>
        <a href="/admin" style={{
          background: "var(--color-brand-coral)",
          color: "var(--color-text-inverse)",
          padding: "var(--space-2) var(--space-4)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-body)",
          fontWeight: "var(--font-weight-medium)",
          textDecoration: "none",
        }}>
          Upload data
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>
          Program increment overview
        </p>
        <h1 style={{ color: "var(--color-text-primary)" }}>PI health tracker</h1>
      </div>

      {/* Stat cards */}
      <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
        <StatCard label="PIs tracked" value={pis.length} />
        <StatCard label="Total issues" value={totalIssues} />
        <StatCard
          label="Avg complete"
          value={avgComplete + "%"}
          color={avgComplete >= 60 ? "var(--color-status-success)" : avgComplete >= 30 ? "var(--color-status-warning)" : "var(--color-status-danger)"}
        />
        <StatCard
          label="Critical findings"
          value={critCount}
          color={critCount > 0 ? "var(--color-status-danger)" : undefined}
        />
      </div>

      {/* AI insights + briefing */}
      <div className="insights-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "var(--space-5)", marginBottom: "var(--space-8)", alignItems: "start" }}>
        <NorthlineInsightsStrip />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <LodestarBriefingPanel />
          <AskLodestar />
        </div>
      </div>

      {error && (
        <div style={{
          background: "var(--color-fill-danger)",
          border: "0.5px solid var(--color-status-danger)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3) var(--space-4)",
          fontSize: "var(--font-size-body)",
          color: "var(--color-status-danger)",
          marginBottom: "var(--space-6)",
        }}>
          API error: {error}. Make sure the FastAPI backend is running.
        </div>
      )}

      {/* Main content: PIs + findings rail */}
      <div className="content-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "var(--space-6)", alignItems: "start" }}>
        <div>
          <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)" }}>
            Program increments — {pis.length} total
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
            {pis.map((pi, i) => (
              <PICard key={pi.name ?? i} pi={pi} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", position: "sticky", top: 72 }}>
          <div>
            <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)" }}>
              Risk findings — {findings.length} total
            </p>
            <FindingsPanel findings={findings} />
          </div>
          <RecentActivityFeed />
          <div className="mobile-only">
            <TopFindings />
          </div>
        </div>
      </div>
    </>
  );
}
