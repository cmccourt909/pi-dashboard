import { api } from "@/lib/api";

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

export default async function FindingsPage() {
  let findings: any[] = [];
  let error: string | null = null;

  try {
    findings = await api.getFindings();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load findings";
  }

  const critical = findings.filter((f) => f.severity === "critical");
  const warning = findings.filter((f) => f.severity === "warning");
  const info = findings.filter((f) => f.severity === "info");

  return (
    <>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
          Risk detection
        </p>
        <h1>Findings</h1>
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
          {error}
        </div>
      )}

      {/* Summary badges */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        {[
          { count: critical.length, label: "Critical", color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
          { count: warning.length, label: "Warning", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
          { count: info.length, label: "Info", color: "var(--color-indigo-600)", bg: "var(--color-indigo-100)" },
        ].map(({ count, label, color, bg }) => (
          <span key={label} style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: "var(--radius-full)",
            background: bg,
            color,
            fontSize: 12,
            fontWeight: 500,
          }}>
            {count} {label}
          </span>
        ))}
      </div>

      {/* Findings list */}
      <div style={{ background: "#FFFFFF", border: "0.5px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        {findings.length === 0 && !error && (
          <div style={{ padding: "var(--space-10)", textAlign: "center", color: "var(--color-text-muted)" }}>
            No findings. Upload data to run risk analysis.
          </div>
        )}
        {findings.map((f, i) => (
          <div
            key={f.rule_id ?? i}
            style={{
              padding: "var(--space-4) var(--space-5)",
              borderBottom: i < findings.length - 1 ? "0.5px solid var(--color-border)" : "none",
              borderLeft: `2.5px solid ${severityColor(f.severity)}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
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
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {f.category}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)", marginLeft: "auto" }}>
                {f.rule_id}
              </span>
            </div>

            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-indigo-900)", marginBottom: 4 }}>
              {f.title}
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: 6 }}>
              {f.detail}
            </p>

            {f.recommendation && (
              <p style={{ fontSize: 13, color: "var(--color-indigo-600)", marginBottom: 6 }}>
                → {f.recommendation}
              </p>
            )}

            {f.issue_keys?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {f.issue_keys.map((key: string) => (
                  <span key={key} style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    background: "var(--color-indigo-50)",
                    color: "var(--color-indigo-600)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                  }}>
                    {key}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
