import { api, healthToStatus } from "@/lib/api";
import PICard from "@/components/PICard";

function SectionLabel({ children }) {
  return (
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6 }}>
      {children}
    </p>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: accent ?? "var(--text-primary)", lineHeight: 1 }}>
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
  const warning  = findings.filter((f) => f.severity === "warning");
  const info     = findings.filter((f) => f.severity === "info");
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>RISK FINDINGS</span>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { count: critical.length, color: "var(--status-critical)", label: "CRIT" },
            { count: warning.length,  color: "var(--status-warning)",  label: "WARN" },
            { count: info.length,     color: "var(--accent)",          label: "INFO" },
          ].map(({ count, color, label }) => (
            <span key={label} style={{ fontFamily: "var(--font-mono)", fontSize: 13, color, fontWeight: 700, letterSpacing: "0.1em" }}>
              {count} {label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ maxHeight: 560, overflowY: "auto" }}>
        {findings.map((f, i) => (
          <div key={f.id ?? i} style={{ padding: "14px 20px", borderBottom: i < findings.length - 1 ? "1px solid var(--border)" : "none", borderLeft: "3px solid " + severityColor(f.severity) }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: severityColor(f.severity), textTransform: "uppercase", letterSpacing: "0.12em" }}>{f.severity}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>{f.category}</span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 5 }}>{f.title}</p>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.description}</p>
            <p style={{ fontSize: 13, color: "var(--status-warning)", marginTop: 6 }}>→ {f.recommendation}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{f.affected_entity}</p>
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
  const totalIssues  = pis.reduce((s, p) => s + (p.total_issues || 0), 0);
  const avgComplete  = pis.length > 0 ? Math.round(pis.reduce((s, p) => s + (p.pct_complete || 0), 0) / pis.length) : 0;
  const critCount    = findings.filter((f) => f.severity === "critical").length;

  return (
    <>
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.15em", color: "var(--text-secondary)", marginBottom: 8 }}>PROGRAM INCREMENT OVERVIEW</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>PI HEALTH TRACKER</h1>
        </div>
        <div style={{ display: "flex", gap: 40, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 4, padding: "20px 32px" }}>
          <Stat label="PIs"          value={pis.length} />
          <Stat label="Issues"       value={totalIssues} />
          <Stat label="Avg Complete" value={avgComplete + "%"} accent={avgComplete >= 75 ? "var(--status-healthy)" : avgComplete >= 50 ? "var(--status-warning)" : "var(--status-critical)"} />
          <Stat label="Critical"     value={critCount} accent={critCount > 0 ? "var(--status-critical)" : undefined} />
        </div>
      </div>

      {error && (
        <div style={{ background: "color-mix(in srgb, var(--status-critical) 10%, transparent)", border: "1px solid var(--status-critical)", borderRadius: 4, padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--status-critical)", marginBottom: 24 }}>
          ⚠ API error: {error}. Make sure the FastAPI backend is running on port 8000.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 24, alignItems: "start" }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 14 }}>
            Program Increments — {pis.length} total
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {pis.map((pi, i) => (
              <PICard key={pi.name ?? i} pi={pi} />
            ))}
          </div>
        </div>
        <div style={{ position: "sticky", top: 72 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 14 }}>
            Risk Findings — {findings.length} total
          </p>
          <FindingsPanel findings={findings} />
        </div>
      </div>
    </>
  );
}
