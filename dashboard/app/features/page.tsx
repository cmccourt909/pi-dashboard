"use client";

import { useEffect, useState, useMemo } from "react";
import { API_BASE } from "@/lib/api";

// ── types ─────────────────────────────────────────────────────────────────────

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
  jira_status?: string;
  stories: Story[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function healthToStatus(health: string) {
  if (health === "green") return "healthy";
  if (health === "red") return "critical";
  if (health === "yellow") return "warning";
  return "unknown";
}

function statusColor(status: string) {
  if (status === "healthy") return "var(--status-healthy)";
  if (status === "critical") return "var(--status-critical)";
  if (status === "warning") return "var(--status-warning)";
  return "var(--text-muted)";
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
      {children}
    </p>
  );
}

function ProgressBar({ value, status }: { value: number; status: string }) {
  const color = statusColor(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "var(--track-bg)", borderRadius: 2, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, right: (100 - Math.min(100, value)) + "%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color, minWidth: 36, textAlign: "right", fontWeight: 600 }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

function StoryRow({ story }: { story: Story }) {
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
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color, textAlign: "center" }}>{story.status}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "center" }}>{story.story_points ?? 0} pts</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: story.blocked ? "var(--status-critical)" : "var(--text-muted)", textAlign: "center", fontWeight: story.blocked ? 700 : 400 }}>
        {story.blocked ? "BLOCKED" : sprintShort}
      </span>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const [expanded, setExpanded] = useState(true);
  const status = healthToStatus(feature.health);
  const color = statusColor(status);
  const byProject: Record<string, Story[]> = {};
  for (const s of feature.stories) {
    if (!byProject[s.project_key]) byProject[s.project_key] = [];
    byProject[s.project_key].push(s);
  }

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
      {/* Header */}
      <div
        style={{ padding: "20px 24px", borderBottom: expanded ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 6 }}>{feature.feature_key}</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>{feature.feature_summary}</h2>
          <ProgressBar value={feature.pct_complete || 0} status={status} />
        </div>
        <div style={{ display: "flex", gap: 32, flexShrink: 0, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, padding: "14px 20px", alignItems: "flex-start" }}>
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
          <div style={{ marginLeft: 8, color: "var(--text-muted)", fontSize: 14, alignSelf: "center" }}>
            {expanded ? "▲" : "▼"}
          </div>
        </div>
      </div>

      {/* Story list */}
      {expanded && (
        <div style={{ padding: "0 24px 8px" }}>
          {Object.entries(byProject).map(([proj, stories]) => (
            <div key={proj} style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em" }}>{proj}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{stories.filter(s => s.status_category === "done").length} / {stories.length} done</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 60px 60px", gap: 12, padding: "4px 0 6px", borderBottom: "1px solid var(--border-strong)", marginBottom: 2 }}>
                {["KEY", "SUMMARY", "STATUS", "PTS", "SPRINT"].map(h => (
                  <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textAlign: h === "PTS" || h === "SPRINT" ? "center" : "left" }}>{h}</span>
                ))}
              </div>
              {stories.map(s => <StoryRow key={s.jira_key} story={s} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── filter bar ────────────────────────────────────────────────────────────────

const HEALTH_FILTERS = [
  { key: "all",      label: "All" },
  { key: "green",    label: "On Track",  color: "var(--status-healthy)" },
  { key: "yellow",   label: "At Risk",   color: "var(--status-warning)" },
  { key: "red",      label: "Critical",  color: "var(--status-critical)" },
  { key: "blocked",  label: "Blocked",   color: "var(--status-critical)" },
  { key: "no_stories", label: "No Stories", color: "var(--text-muted)" },
];

function FilterBar({
  active,
  onChange,
  counts,
}: {
  active: string;
  onChange: (k: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {HEALTH_FILTERS.map(f => {
        const isActive = active === f.key;
        const count = counts[f.key] ?? 0;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              padding: "5px 12px",
              borderRadius: 3,
              border: `1px solid ${isActive ? (f.color ?? "var(--accent)") : "var(--border)"}`,
              background: isActive ? (f.key === "all" ? "var(--accent-light)" : `color-mix(in srgb, ${f.color} 10%, white)`) : "var(--bg-panel)",
              color: isActive ? (f.color ?? "var(--accent)") : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {f.label}
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 2,
              background: isActive ? "rgba(0,0,0,0.08)" : "var(--bg-card)",
              color: isActive ? "inherit" : "var(--text-muted)",
              minWidth: 18,
              textAlign: "center",
            }}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── search bar ────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <circle cx="11" cy="11" r="8" stroke="var(--text-muted)" strokeWidth="2"/>
        <path d="M21 21l-4.35-4.35" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <input
        type="text"
        placeholder="Search features or stories…"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          padding: "6px 12px 6px 30px",
          border: "1px solid var(--border)",
          borderRadius: 3,
          background: "var(--bg-panel)",
          color: "var(--text-primary)",
          width: 240,
          outline: "none",
        }}
      />
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

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
      .catch(() => { setError("Make sure the backend is running"); setLoading(false); });
  }, []);

  // Counts per filter bucket
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: features.length };
    for (const f of features) {
      c[f.health] = (c[f.health] ?? 0) + 1;
      if (f.blocked_stories > 0) c["blocked"] = (c["blocked"] ?? 0) + 1;
      if (f.total_stories === 0) c["no_stories"] = (c["no_stories"] ?? 0) + 1;
    }
    return c;
  }, [features]);

  // Apply filter + search
  const visible = useMemo(() => {
    let result = features;

    if (filter === "blocked") {
      result = result.filter(f => f.blocked_stories > 0);
    } else if (filter === "no_stories") {
      result = result.filter(f => f.total_stories === 0);
    } else if (filter !== "all") {
      result = result.filter(f => f.health === filter);
    }

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

  const totalStories = features.reduce((s, f) => s + (f.total_stories || 0), 0);
  const doneStories = features.reduce((s, f) => s + (f.done_stories || 0), 0);
  const blockedStories = features.reduce((s, f) => s + (f.blocked_stories || 0), 0);

  return (
    <>
      {/* Page header */}
      <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
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

      {/* Filter + search bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <FilterBar active={filter} onChange={setFilter} counts={counts} />
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Results count */}
      {(filter !== "all" || search) && (
        <div style={{ marginBottom: 16, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
          Showing {visible.length} of {features.length} features
          {search && <span> matching "<strong style={{ color: "var(--text-secondary)" }}>{search}</strong>"</span>}
          {filter !== "all" && (
            <button
              onClick={() => { setFilter("all"); setSearch(""); }}
              style={{ marginLeft: 12, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              clear filters
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "color-mix(in srgb, var(--status-critical) 10%, transparent)", border: "1px solid var(--status-critical)", borderRadius: 4, padding: "12px 20px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--status-critical)", marginBottom: 24 }}>
          ⚠ API error: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, padding: 32 }}>
          Loading features…
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          No features match the current filter.
          <br />
          <button
            onClick={() => { setFilter("all"); setSearch(""); }}
            style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Feature cards */}
      {visible.map((f, i) => <FeatureCard key={f.feature_key ?? i} feature={f} />)}
    </>
  );
}
