const fs = require('fs');
const content = fs.readFileSync('app/features/page.tsx', 'utf8');

const oldRow = `function StoryRow({ story }) {
  const color = story.status_category === "done"
    ? "var(--status-healthy)"
    : story.status_category === "indeterminate"
    ? "var(--status-warning)"
    : "var(--text-muted)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 60px 60px", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.05em" }}>{story.jira_key}</span>
      <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>{story.summary.length > 80 ? story.summary.slice(0, 80) + "..." : story.summary}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: color, textAlign: "center" }}>{story.status}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "center" }}>{story.story_points ?? 0} pts</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: story.blocked ? "var(--status-critical)" : "var(--text-muted)", textAlign: "center" }}>
        {story.blocked ? "BLOCKED" : story.sprint_name ? story.sprint_name.replace("Sprint ", "").replace("ISC ", "").replace("TSU ", "").replace("Panthers ", "") : "-"}
      </span>
    </div>
  );
}`;

const newRow = `function StoryRow({ story }) {
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
}`;

const updated = content.replace(oldRow, newRow);
if (updated === content) {
  console.log('ERROR: could not find StoryRow to replace');
} else {
  fs.writeFileSync('app/features/page.tsx', updated);
  console.log('Done - blocked stories highlighted');
}