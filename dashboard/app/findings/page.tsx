"use client";

import { useEffect, useState, useMemo } from "react";
import { API_BASE } from "@/lib/api";

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

interface Finding {
  rule_id: string;
  severity: string;
  category: string;
  title: string;
  detail: string;
  recommendation: string;
  issue_keys: string[];
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/findings`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => setFindings(data))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const categories = useMemo(() => Array.from(new Set(findings.map(f => f.category))), [findings]);

  const visible = useMemo(() => {
    let result = findings;
    if (severityFilter.length > 0) result = result.filter(f => severityFilter.includes(f.severity));
    if (categoryFilter !== "all") result = result.filter(f => f.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f => f.title.toLowerCase().includes(q) || f.detail.toLowerCase().includes(q) || f.issue_keys.some(k => k.toLowerCase().includes(q)));
    }
    return result;
  }, [findings, severityFilter, categoryFilter, search]);

  const critical = findings.filter(f => f.severity === "critical").length;
  const warning = findings.filter(f => f.severity === "warning").length;
  const info = findings.filter(f => f.severity === "info").length;

  function toggleSeverity(s: string) {
    setSeverityFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  return (
    <>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Risk detection</p>
        <h1>Findings</h1>
      </div>

      {error && (
        <div style={{ background: "var(--color-danger-bg)", border: "0.5px solid var(--color-danger)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", fontSize: 13, color: "var(--color-danger)", marginBottom: "var(--space-6)" }}>
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
        {/* Severity pills */}
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {[
            { key: "critical", label: "Critical", count: critical, color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
            { key: "warning", label: "Warning", count: warning, color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
            { key: "info", label: "Info", count: info, color: "var(--color-indigo-600)", bg: "var(--color-indigo-100)" },
          ].map(({ key, label, count, color, bg }) => {
            const active = severityFilter.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleSeverity(key)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-full)",
                  border: `0.5px solid ${active ? color : "var(--color-border)"}`,
                  background: active ? bg : "transparent",
                  color: active ? color : "var(--color-text-muted)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {count} {label}
              </button>
            );
          })}
        </div>

        {/* Category dropdown */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{
            padding: "5px 10px",
            border: "0.5px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--color-text)",
            background: "#FFFFFF",
          }}
        >
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Search findings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: "5px 12px",
            border: "0.5px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            color: "var(--color-text)",
            background: "#FFFFFF",
            width: 200,
            marginLeft: "auto",
          }}
        />
      </div>

      {/* Results count */}
      {(severityFilter.length > 0 || categoryFilter !== "all" || search) && (
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          Showing {visible.length} of {findings.length} findings
        </p>
      )}

      {/* Findings table */}
      <div style={{ background: "#FFFFFF", border: "0.5px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        {visible.length === 0 && !error && (
          <div style={{ padding: "var(--space-10)", textAlign: "center", color: "var(--color-text-muted)" }}>
            No findings match the current filters.
          </div>
        )}
        {visible.map((f, i) => {
          const isExpanded = expanded === f.rule_id + i;
          return (
            <div
              key={f.rule_id + i}
              onClick={() => setExpanded(isExpanded ? null : f.rule_id + i)}
              style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: i < visible.length - 1 ? "0.5px solid var(--color-border)" : "none",
                borderLeft: `2.5px solid ${severityColor(f.severity)}`,
                cursor: "pointer",
                background: isExpanded ? "var(--color-indigo-50)" : "transparent",
                transition: "background 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: severityColor(f.severity), background: severityBg(f.severity), padding: "1px 8px", borderRadius: "var(--radius-full)" }}>
                  {f.severity}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{f.category}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)", marginLeft: "auto" }}>{f.rule_id}</span>
              </div>

              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-indigo-900)", marginBottom: isExpanded ? 6 : 0 }}>{f.title}</p>

              {isExpanded && (
                <>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: 6 }}>{f.detail}</p>
                  {f.recommendation && (
                    <p style={{ fontSize: 13, color: "var(--color-indigo-600)", marginBottom: 6 }}>→ {f.recommendation}</p>
                  )}
                  {f.issue_keys?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {f.issue_keys.map(key => (
                        <span key={key} style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--color-indigo-50)", color: "var(--color-indigo-600)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                          {key}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
