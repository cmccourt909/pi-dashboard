import { api } from "@/lib/api";
import { notFound } from "next/navigation";

function healthToStatus(health: string) {
  if (health === "green") return "healthy";
  if (health === "red") return "critical";
  if (health === "yellow") return "warning";
  return "unknown";
}

function statusColor(status: string) {
  if (status === "healthy") return "var(--color-status-success)";
  if (status === "critical") return "var(--color-status-danger)";
  if (status === "warning") return "var(--color-status-warning)";
  return "var(--color-text-secondary)";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 4 }}>
      {children}
    </p>
  );
}

function ProgressBar({ value, status }: { value: number; status: string }) {
  const color = statusColor(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "var(--color-fill-neutral)", borderRadius: "var(--radius-sm)", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, right: (100 - Math.min(100, value)) + "%", background: color, borderRadius: "var(--radius-sm)" }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-caption)", color: color, minWidth: 36, textAlign: "right", fontWeight: "var(--font-weight-semi)", fontFeatureSettings: '"tnum" 1' }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

function SprintCard({ sprint }: { sprint: any }) {
  const stateColor = sprint.state === "active"
    ? "var(--color-status-warning)"
    : sprint.state === "closed"
      ? "var(--color-status-success)"
      : "var(--color-text-secondary)";
  const status = sprint.state === "active" ? "warning" : sprint.state === "closed" ? "healthy" : "unknown";

  return (
    <div style={{
      background: "var(--color-surface-card)",
      border: "0.5px solid var(--color-border-default)",
      borderLeft: `3px solid ${stateColor}`,
      borderRadius: "var(--radius-md)",
      padding: "var(--space-4) var(--space-5)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)" }}>
        <div>
          <p style={{ fontSize: "var(--font-size-label)", color: stateColor, fontWeight: "var(--font-weight-bold)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            {sprint.state}
          </p>
          <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-primary)" }}>
            {sprint.name}
          </h3>
        </div>
        {sprint.blocked_issues > 0 && (
          <span style={{
            fontSize: "var(--font-size-label)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-status-danger)",
            background: "var(--color-fill-danger)",
            borderRadius: "var(--radius-sm)",
            padding: "2px 8px",
            letterSpacing: "0.06em",
          }}>
            {sprint.blocked_issues} BLOCKED
          </span>
        )}
      </div>

      <div style={{ marginBottom: "var(--space-3)" }}>
        <ProgressBar value={sprint.pct_complete || 0} status={status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)", paddingTop: "var(--space-3)", borderTop: "0.5px solid var(--color-border-default)" }}>
        {[
          { label: "Issues", value: sprint.total_issues },
          { label: "Done", value: sprint.done_issues },
          { label: "Blocked", value: sprint.blocked_issues },
        ].map(({ label, value }) => (
          <div key={label}>
            <SectionLabel>{label}</SectionLabel>
            <p style={{
              fontSize: "var(--font-size-h3)",
              fontWeight: "var(--font-weight-semi)",
              fontFeatureSettings: '"tnum" 1',
              color: label === "Blocked" && value > 0
                ? "var(--color-status-danger)"
                : label === "Done" && value > 0
                  ? "var(--color-status-success)"
                  : "var(--color-text-primary)",
            }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {sprint.start_date && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-label)", color: "var(--color-text-secondary)", marginTop: "var(--space-3)", letterSpacing: "0.03em" }}>
          {sprint.start_date} → {sprint.end_date}
        </p>
      )}
    </div>
  );
}

export default async function PIDetailPage({ params }) {
  const { name } = await params;
  const piName = decodeURIComponent(name);
  let pis = [];
  try {
    pis = await api.getPIs();
  } catch (e) {
    return (
      <div style={{ fontSize: "var(--font-size-body)", color: "var(--color-status-danger)", padding: "var(--space-8)" }}>
        Failed to load PI data. Make sure the backend is running on port 8000.
      </div>
    );
  }
  const pi = pis.find((p) => p.name === piName);
  if (!pi) notFound();
  const status = healthToStatus(pi.health);
  const color = statusColor(status);
  const activesprints = pi.sprints.filter((s) => s.state === "active");
  const closedsprints = pi.sprints.filter((s) => s.state === "closed");
  const futuresprints = pi.sprints.filter((s) => s.state === "future");

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "var(--space-2)" }}>
        <a href="/" style={{ fontSize: "var(--font-size-label)", color: "var(--color-text-secondary)", letterSpacing: "0.06em", textDecoration: "none" }}>
          ← PI OVERVIEW
        </a>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: "var(--space-8)", paddingBottom: "var(--space-5)", borderBottom: "0.5px solid var(--color-border-default)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <p style={{ fontSize: "var(--font-size-label)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>
            Program Increment
          </p>
          <h1 style={{ color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>
            PI {pi.name}
          </h1>
          <ProgressBar value={pi.pct_complete || 0} status={status} />
        </div>

        {/* Summary stats */}
        <div style={{
          display: "flex",
          gap: "var(--space-6)",
          background: "var(--color-surface-card)",
          border: "0.5px solid var(--color-border-default)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-4) var(--space-6)",
        }}>
          {[
            { label: "Sprints", value: pi.sprints.length },
            { label: "Issues", value: pi.total_issues },
            { label: "Done", value: pi.done_issues, accent: pi.done_issues > 0 ? "var(--color-status-success)" : undefined },
            { label: "Blocked", value: pi.blocked_issues, accent: pi.blocked_issues > 0 ? "var(--color-status-danger)" : undefined },
            { label: "Critical", value: pi.critical_findings, accent: pi.critical_findings > 0 ? "var(--color-status-danger)" : undefined },
            { label: "Complete", value: Math.round(pi.pct_complete || 0) + "%", accent: color },
          ].map(({ label, value, accent }) => (
            <div key={label}>
              <SectionLabel>{label}</SectionLabel>
              <p style={{
                fontSize: "var(--font-size-h2)",
                fontWeight: "var(--font-weight-bold)",
                color: accent ?? "var(--color-text-primary)",
                lineHeight: 1,
                fontFeatureSettings: '"tnum" 1',
              }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {pi.sprints.length === 0 && (
        <div style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-secondary)", padding: "var(--space-10) 0", textAlign: "center" }}>
          No sprints planned for this PI
        </div>
      )}

      {/* Active Sprints */}
      {activesprints.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-status-warning)", marginBottom: "var(--space-3)" }}>
            Active Sprints — {activesprints.length}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
            {activesprints.map((s) => <SprintCard key={s.jira_id} sprint={s} />)}
          </div>
        </div>
      )}

      {/* Upcoming Sprints */}
      {futuresprints.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)" }}>
            Upcoming Sprints — {futuresprints.length}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
            {futuresprints.map((s) => <SprintCard key={s.jira_id} sprint={s} />)}
          </div>
        </div>
      )}

      {/* Closed Sprints */}
      {closedsprints.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <p style={{ fontSize: "var(--font-size-label)", fontWeight: "var(--font-weight-medium)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)" }}>
            Closed Sprints — {closedsprints.length}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
            {closedsprints.map((s) => <SprintCard key={s.jira_id} sprint={s} />)}
          </div>
        </div>
      )}
    </>
  );
}
