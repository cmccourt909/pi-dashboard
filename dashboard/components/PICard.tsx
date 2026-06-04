"use client";

import HealthBadge from "@/components/HealthBadge";
import ProgressBar from "@/components/ProgressBar";

function healthToStatus(health) {
  if (health === "green")  return "healthy";
  if (health === "red")    return "critical";
  if (health === "amber" || health === "yellow") return "warning";
  return "unknown";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 5 }}>
      {children}
    </p>
  );
}

export default function PICard({ pi }: { pi: any }) {
  const status = healthToStatus(pi.health);
  const href   = "/pi/" + pi.name;

  return (
    <a
      href={href}
      style={{ display: "block", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, padding: "22px 24px", textDecoration: "none", transition: "border-color 0.15s, background 0.15s, transform 0.15s", cursor: "pointer" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.background  = "var(--bg-hover)";
        e.currentTarget.style.transform   = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background  = "var(--bg-card)";
        e.currentTarget.style.transform   = "translateY(0)";
      }}
    >
      {/* PI name + health badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)", letterSpacing: "0.1em", marginBottom: 5 }}>PI</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
            {pi.name}
          </h2>
        </div>
        <HealthBadge status={status} />
      </div>

      {/* Completion bar */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <SectionLabel>Completion</SectionLabel>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
            {pi.done_issues} / {pi.total_issues} issues
          </span>
        </div>
        <ProgressBar value={pi.pct_complete || 0} status={status} />
      </div>

      {/* Sprints / Issues / Blocked */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        {[
          { label: "Sprints", value: pi.sprints.length },
          { label: "Issues",  value: pi.total_issues },
          { label: "Blocked", value: pi.blocked_issues },
        ].map(({ label, value }) => (
          <div key={label}>
            <SectionLabel>{label}</SectionLabel>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: label === "Blocked" && value > 0 ? "var(--status-critical)" : "var(--text-primary)" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Sprint bars */}
      {pi.sprints.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Sprints</SectionLabel>
          <div style={{ display: "flex", gap: 3, marginTop: 8, alignItems: "flex-end", height: 32 }}>
            {pi.sprints.map((s) => {
              const pct   = s.pct_complete || 0;
              const color = s.state === "closed" ? "var(--status-healthy)" : s.state === "active" ? "var(--status-warning)" : "var(--text-muted)";
              return (
                <div key={s.jira_id} title={s.name + ": " + pct + "%"} style={{ flex: 1, background: "var(--track-bg)", borderRadius: 2, height: "100%", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: pct + "%", background: color, opacity: 0.85, borderRadius: 2 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </a>
  );
}
