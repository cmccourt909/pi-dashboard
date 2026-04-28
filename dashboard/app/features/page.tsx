import { api } from "@/lib/api";

function healthToStatus(health) {
  if (health === "green") return "healthy";
  if (health === "red") return "critical";
  if (health === "yellow") return "warning";
  return "unknown";
}

function statusColor(status) {
  if (status === "healthy") return "var(--status-healthy)";
  if (status === "critical") return "var(--status-critical)";
  if (status === "warning") return "var(--status-warning)";
  return "var(--text-muted)";
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
      {children}
    </p>
  );
}

function ProgressBar({ value, status }) {
  const color = statusColor(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "var(--track-bg)", borderRadius: 2, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, right: (100 - Math.min(100, value)) + "%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: color, minWidth: 36, textAlign: "right", fontWeight: 600 }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

function StoryRow({ story }) {
  const color = story.status_category === "done"
    ? "var(--status-healthy)"
    : story.status_category === "indeterminate"
    ? "var(--status-warning)"
    : "var(--text-muted)";
  const sprintShort = story.sprint_name
    ? story.sprint_name.replace("Sprint ", "").replace("ISC ", "").replace("TSU ", "").replace("Panthers ", "")
    : "-";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "80px 1fr 80px 60px 60px",
      gap: 12,
      padding: "8px 0",
      borderBottom: "1px solid var(--border)",
      borderLeft: story.blocked ? "3px solid var(--status-critical)" : "3px solid transparent",
      paddingLeft: story.blocked ? 8 : 0,
      background: story.blocked ? "color-mix(in srgb, var(--status-critical) 6%, transparent)" : "transparent",
      alignItems: "center",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: story.blocked ? "var(--status-critical)" : "var(--accent)", letterSpacing: "0.05em" }}>{story.jira_key}</span>
      <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>{story.summary.length > 80 ? story.summary.slice(0, 80) + "..." : story.summary}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: color, textAlign: "center" }}>{story.status}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "center" }}>{story.story_points ?? 0} pts</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: story.blocked ? "var(--status-critical)" : "var(--text-muted)", textAlign: "center", fontWeight: story.blocked ? 700 : 400 }}>
        {story.blocked ? "BLOCKED" : sprintShort}
      </span>
    </div>
  );
}

function FeatureCard({ feature }) {
  const status = healthToStatus(feature.health);
  const color = statusColor(status);
  const byProject = {};
  for (const s of feature.stories) {
    if (!byProject[s.project_key]) byProject[s.project_key] = [];
    byProject[s.project_key].push(s);
  }
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 6 }}>{feature.feature_key}</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>{feature.feature_summary}</h2>
          <ProgressBar value={feature.pct_complete || 0} status={status} />
        </div>
        <div style={{ display: "flex", gap: 32, flexShrink: 0, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, padding: "14px 20px" }}>
          {[
            { label: "Total", value: feature.total_stories },
            { label: "Done", value: feature.done_stories, color: "var(--status-healthy)" },
            { label: "Blocked", value: feature.blocked_stories, color: feature.blocked_stories > 0 ? "var(--status-critical)" : undefined },
            { label: "Complete", value: Math.round(feature.pct_complete || 0) + "%", color },
          ].map(({ label, value, color: c }) => (
            <div key={label}>
              <SectionLabel>{label}</SectionLabel>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: c ?? "var(--text-primary)", lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 24px 8px" }}>
        {Object.entries(byProject).map(([proj, stories]) => (
          <div key={proj} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em" }}>{proj}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{stories.filter(s => s.status_category === "done").length} / {stories.length} done</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 60px 60px", gap: 12, padding: "4px 0 6px", borderBottom: "1px solid var(--border-strong)", marginBottom: 2 }}>
              {["KEY","SUMMARY","STATUS","PTS","SPRINT"].map(h => (
                <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textAlign: h === "PTS" || h === "SPRINT" ? "center" : "left" }}>{h}</span>
              ))}
            </div>
            {stories.map(s => <StoryRow key={s.jira_key} story={s} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function FeaturesPage() {
  let features = [];
  let error = null;
  try {
    features = await api.getFeatures();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load features";
  }
  const totalStories = features.reduce((s, f) => s + (f.total_stories || 0), 0);
  const doneStories = features.reduce((s, f) => s + (f.done_stories || 0), 0);
  const blockedStories = features.reduce((s, f) => s + (f.blocked_stories || 0), 0);
  return (
    <>
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: 6 }}>FEATURE HEALTH</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>FEATURES</h1>
        </div>
        <div style={{ display: "flex", gap: 40, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 4, padding: "16px 28px" }}>
          {[
            { label: "Features", value: features.length },
            { label: "Total Stories", value: totalStories },
            { label: "Done", value: doneStories, accent: "var(--status-healthy)" },
            { label: "Blocked", value: blockedStories, accent: blockedStories > 0 ? "var(--status-critical)" : undefined },
          ].map(({ label, value, accent }) => (
            <div key={label}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: accent ?? "var(--text-primary)", lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
      {error && (
        <div style={{ background: "color-mix(in srgb, var(--status-critical) 10%, transparent)", border: "1px solid var(--status-critical)", borderRadius: 4, padding: "12px 20px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--status-critical)", marginBottom: 24 }}>
          {"⚠"} API error: {error}
        </div>
      )}
      {features.map((f, i) => <FeatureCard key={f.feature_key ?? i} feature={f} />)}
    </>
  );
}