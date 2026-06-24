"use client";

import HealthBadge from "@/components/HealthBadge";
import ProgressBar from "@/components/ProgressBar";

function healthToStatus(health: string) {
  if (health === "green") return "healthy" as const;
  if (health === "red") return "critical" as const;
  if (health === "amber" || health === "yellow") return "warning" as const;
  return "unknown" as const;
}

export default function PICard({ pi }: { pi: any }) {
  const status = healthToStatus(pi.health);
  const href = "/pi/" + pi.name;

  return (
    <a
      href={href}
      style={{
        display: "block",
        background: "#FFFFFF",
        border: "0.5px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        textDecoration: "none",
        transition: "border-color 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-em)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
      }}
    >
      {/* PI name + health badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 4 }}>
            Program increment
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-indigo-900)", fontFeatureSettings: '"tnum" 1' }}>
            {pi.name}
          </h2>
        </div>
        <HealthBadge status={status} />
      </div>

      {/* Completion bar */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
            Completion
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-muted)", fontFeatureSettings: '"tnum" 1' }}>
            {pi.done_issues}/{pi.total_issues}
          </span>
        </div>
        <ProgressBar value={pi.pct_complete || 0} status={status} />
      </div>

      {/* Sprints / Issues / Blocked */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", paddingTop: "var(--space-4)", borderTop: "0.5px solid var(--color-border)" }}>
        {[
          { label: "Sprints", value: pi.sprints.length },
          { label: "Issues", value: pi.total_issues },
          { label: "Blocked", value: pi.blocked_issues, danger: true },
        ].map(({ label, value, danger }) => (
          <div key={label}>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 4 }}>
              {label}
            </p>
            <p style={{
              fontSize: 22,
              fontWeight: 500,
              fontFeatureSettings: '"tnum" 1',
              color: danger && value > 0 ? "var(--color-danger)" : "var(--color-indigo-900)",
            }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Sprint mini bars */}
      {pi.sprints.length > 0 && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 28 }}>
            {pi.sprints.map((s: any) => {
              const pct = s.pct_complete || 0;
              const color = s.state === "closed" ? "var(--color-success)" : s.state === "active" ? "var(--color-indigo-600)" : "var(--color-indigo-200)";
              return (
                <div
                  key={s.jira_id}
                  title={`${s.name}: ${pct}%`}
                  style={{ flex: 1, background: "var(--color-indigo-100)", borderRadius: 2, height: "100%", position: "relative", overflow: "hidden" }}
                >
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${pct}%`, background: color, borderRadius: 2 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </a>
  );
}
