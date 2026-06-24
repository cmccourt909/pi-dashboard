import { api, healthToStatus } from "@/lib/api";
import PICard from "@/components/PICard";

function severityColor(s: string) {
  if (s === "critical") return "var(--color-danger)";
  if (s === "warning") return "var(--color-warning)";
  return "var(--color-indigo-600)";
}

function severityBg(s: string) {
  if (s === "critical") return "var(--color-danger-bg)";
  if (s === "warning") return "var(--color-warning-bg)";
  return "var(--color-indigo-100)";
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "0.5px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      padding: "14px 16px",
    }}>
      <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 6 }}>
        {label}
      </p>
      <p style={{
        fontSize: 22,
        fontWeight: 500,
        color: color ?? "var(--color-indigo-900)",
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
      style={{ background: "#FFFFFF", border: "0.5px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "0.5px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-indigo-900)" }}>Findings</span>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { count: critical.length, color: "var(--color-danger)", label: "critical" },
            { count: warning.length, color: "var(--color-warning)", label: "warn" },
            { count: info.length, color: "var(--color-indigo-600)", label: "info" },
          ].map(({ count, color, label }) => (
            <span key={label} style={{ fontSize: 11, fontWeight: 500, color }}>
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
              borderBottom: i < findings.length - 1 ? "0.5px solid var(--color-border)" : "none",
              borderLeft: `2.5px solid ${severityColor(f.severity)}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: severityColor(f.severity),
                background: severityBg(f.severity),
                padding: "1px 8px",
                borderRadius: "var(--radius-full)",
              }}>
                {f.severity}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-muted)" }}>
                {f.category}
              </span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-indigo-900)", marginBottom: 2 }}>
              {f.title}
            </p>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              {f.detail}
            </p>
            {f.recommendation && (
              <p style={{ fontSize: 12, color: "var(--color-indigo-600)", marginTop: 4 }}>
                → {f.recommendation}
              </p>
            )}
            {f.issue_keys?.length > 0 && (
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {f.issue_keys.slice(0, 5).map((key: string) => (
                  <span key={key} style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    background: "var(--color-indigo-50)",
                    color: "var(--color-indigo-600)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                  }}>
                    {key}
                  </span>
                ))}
                {f.issue_keys.length > 5 && (
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>+{f.issue_keys.length - 5} more</span>
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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ marginBottom: "var(--space-4)", color: "var(--color-indigo-400)" }}>
          <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 15v2a4 4 0 004 4h10a4 4 0 004-4v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <h2 style={{ marginBottom: "var(--space-2)" }}>No data yet</h2>
        <p style={{ marginBottom: "var(--space-5)" }}>Upload a Jira CSV or XLSX to get started.</p>
        <a href="/admin" style={{
          background: "var(--color-accent)",
          color: "white",
          padding: "8px 16px",
          borderRadius: "var(--radius-md)",
          fontSize: 13,
          fontWeight: 500,
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
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
          Program increment overview
        </p>
        <h1>PI health tracker</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "var(--space-8)" }}>
        <StatCard label="PIs tracked" value={pis.length} />
        <StatCard label="Total issues" value={totalIssues} />
        <StatCard
          label="Avg complete"
          value={avgComplete + "%"}
          color={avgComplete >= 60 ? "var(--color-success)" : avgComplete >= 30 ? "var(--color-warning)" : "var(--color-danger)"}
        />
        <StatCard
          label="Critical findings"
          value={critCount}
          color={critCount > 0 ? "var(--color-danger)" : undefined}
        />
      </div>

      {error && (
        <div style={{
          background: "var(--color-danger-bg)",
          border: "0.5px solid var(--color-danger)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3) var(--space-4)",
          fontSize: 13,
          color: "var(--color-danger)",
          marginBottom: "var(--space-6)",
        }}>
          API error: {error}. Make sure the FastAPI backend is running.
        </div>
      )}

      {/* Main content: PIs + findings rail */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "var(--space-6)", alignItems: "start" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
            Program increments — {pis.length} total
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
            {pis.map((pi, i) => (
              <PICard key={pi.name ?? i} pi={pi} />
            ))}
          </div>
        </div>
        <div style={{ position: "sticky", top: 72 }}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
            Risk findings — {findings.length} total
          </p>
          <FindingsPanel findings={findings} />
        </div>
      </div>
    </>
  );
}
