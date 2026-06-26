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
        background: "var(--color-surface-card)",
        border: "0.5px solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        textDecoration: "none",
        transition: "border-color 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-default)";
      }}
    >
      {/* PI name + health badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
        <div>
          <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 4 }}>
            Program increment
          </p>
          <h2 style={{ fontSize: "var(--font-size-h2)", fontWeight: "var(--font-weight-semi)", color: "var(--color-text-primary)", fontFeatureSettings: '"tnum" 1' }}>
            {pi.name}
          </h2>
        </div>
        <HealthBadge status={status} />
      </div>

      {/* Completion bar */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
            Completion
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFeatureSettings: '"tnum" 1' }}>
            {pi.done_issues}/{pi.total_issues}
          </span>
        </div>
        <ProgressBar value={pi.pct_complete || 0} status={status} />
      </div>

      {/* Sprints / Issues / Blocked */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", paddingTop: "var(--space-4)", borderTop: "0.5px solid var(--color-border-default)" }}>
        {[
          { label: "Sprints", value: pi.sprints.length },
          { label: "Issues", value: pi.total_issues },
          { label: "Blocked", value: pi.blocked_issues, danger: true },
        ].map(({ label, value, danger }) => (
          <div key={label}>
            <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 4 }}>
              {label}
            </p>
            <p style={{
              fontSize: "var(--font-size-h2)",
              fontWeight: "var(--font-weight-semi)",
              fontFeatureSettings: '"tnum" 1',
              color: danger && value > 0 ? "var(--color-status-danger)" : "var(--color-text-primary)",
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
              const color = s.state === "closed" ? "var(--color-status-success)" : s.state === "active" ? "var(--color-interactive-primary)" : "var(--color-brand-slate)";
              return (
                <div
                  key={s.jira_id}
                  title={`${s.name}: ${pct}%`}
                  style={{ flex: 1, background: "var(--color-fill-info)", borderRadius: 2, height: "100%", position: "relative", overflow: "hidden" }}
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
