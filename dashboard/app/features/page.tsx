"use client";

import { useEffect, useState, useMemo } from "react";
import { API_BASE } from "@/lib/api";
import ProgressBar from "@/components/ProgressBar";
import HealthBadge from "@/components/HealthBadge";

interface Story {
  jira_key: string;
  summary: string;
  status: string;
  status_category: string;
  story_points: number | null;
  sprint_name: string | null;
  blocked: boolean;
  project_key: string;
}

interface Feature {
  feature_key: string;
  feature_summary: string;
  health: string;
  total_stories: number;
  done_stories: number;
  blocked_stories: number;
  pct_complete: number;
  stories: Story[];
}

function healthToStatus(health: string) {
  if (health === "green") return "healthy" as const;
  if (health === "red") return "critical" as const;
  if (health === "yellow") return "warning" as const;
  return "unknown" as const;
}

function StoryRow({ story }: { story: Story }) {
  const color = story.status_category === "done" ? "var(--color-success)"
    : story.status_category === "indeterminate" ? "var(--color-indigo-600)"
    : "var(--color-text-muted)";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "90px 1fr 90px 50px",
      gap: 8,
      padding: "8px 0",
      borderBottom: "0.5px solid var(--color-border)",
      borderLeft: story.blocked ? "2.5px solid var(--color-danger)" : "2.5px solid transparent",
      paddingLeft: 8,
      alignItems: "center",
      fontSize: 12,
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: story.blocked ? "var(--color-danger)" : "var(--color-indigo-600)" }}>{story.jira_key}</span>
      <span style={{ color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{story.summary}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color, textAlign: "center" }}>{story.status}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)", textAlign: "center", fontFeatureSettings: '"tnum" 1' }}>{story.story_points ?? "—"}</span>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const [expanded, setExpanded] = useState(false);
  const status = healthToStatus(feature.health);

  return (
    <div style={{ background: "#FFFFFF", border: "0.5px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "var(--space-4)" }}>
      <div
        style={{ padding: "var(--space-5)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-6)", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-indigo-600)" }}>{feature.feature_key}</span>
            <HealthBadge status={status} />
          </div>
          <h3 style={{ marginBottom: "var(--space-3)" }}>{feature.feature_summary}</h3>
          <ProgressBar value={feature.pct_complete || 0} status={status} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-6)", flexShrink: 0 }}>
          {[
            { label: "Stories", value: feature.total_stories },
            { label: "Done", value: feature.done_stories, color: "var(--color-success)" },
            { label: "Blocked", value: feature.blocked_stories, color: feature.blocked_stories > 0 ? "var(--color-danger)" : undefined },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 500, color: color ?? "var(--color-indigo-900)", fontFeatureSettings: '"tnum" 1' }}>{value}</p>
            </div>
          ))}
          <span style={{ color: "var(--color-text-muted)", fontSize: 14, alignSelf: "center" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && feature.stories.length > 0 && (
        <div style={{ padding: "0 var(--space-5) var(--space-4)", borderTop: "0.5px solid var(--color-border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 90px 50px", gap: 8, padding: "var(--space-3) 0 var(--space-2)", paddingLeft: 8 }}>
            {["Key", "Summary", "Status", "SP"].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: h === "SP" || h === "Status" ? "center" : "left" }}>{h}</span>
            ))}
          </div>
          {feature.stories.map(s => <StoryRow key={s.jira_key} story={s} />)}
        </div>
      )}
    </div>
  );
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/features`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { setFeatures(data); setLoading(false); })
      .catch(() => { setError("Backend unreachable"); setLoading(false); });
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: features.length };
    for (const f of features) {
      c[f.health] = (c[f.health] ?? 0) + 1;
      if (f.blocked_stories > 0) c["blocked"] = (c["blocked"] ?? 0) + 1;
    }
    return c;
  }, [features]);

  const visible = useMemo(() => {
    let result = features;
    if (filter === "blocked") result = result.filter(f => f.blocked_stories > 0);
    else if (filter !== "all") result = result.filter(f => f.health === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.feature_key.toLowerCase().includes(q) ||
        f.feature_summary.toLowerCase().includes(q) ||
        f.stories.some(s => s.summary.toLowerCase().includes(q) || s.jira_key.toLowerCase().includes(q))
      );
    }
    return result;
  }, [features, filter, search]);

  const filters = [
    { key: "all", label: "All" },
    { key: "green", label: "Healthy", color: "var(--color-success)" },
    { key: "yellow", label: "At risk", color: "var(--color-warning)" },
    { key: "red", label: "Critical", color: "var(--color-danger)" },
    { key: "blocked", label: "Blocked", color: "var(--color-danger)" },
  ];

  return (
    <>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Feature health</p>
        <h1>Features</h1>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                border: `0.5px solid ${filter === f.key ? (f.color ?? "var(--color-indigo-600)") : "var(--color-border)"}`,
                background: filter === f.key ? (f.color ? f.color + "18" : "var(--color-indigo-50)") : "transparent",
                color: filter === f.key ? (f.color ?? "var(--color-indigo-600)") : "var(--color-text-muted)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {f.label} {counts[f.key] != null && <span style={{ opacity: 0.7 }}>({counts[f.key]})</span>}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search features…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: "6px 12px",
            border: "0.5px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            color: "var(--color-text)",
            background: "#FFFFFF",
            width: 220,
          }}
        />
      </div>

      {error && (
        <div style={{ background: "var(--color-danger-bg)", border: "0.5px solid var(--color-danger)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", fontSize: 13, color: "var(--color-danger)", marginBottom: "var(--space-6)" }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: "var(--color-text-muted)" }}>Loading features…</p>}

      {!loading && visible.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--color-text-muted)" }}>
          No features match the current filter.
        </div>
      )}

      {visible.map(f => <FeatureCard key={f.feature_key} feature={f} />)}
    </>
  );
}
