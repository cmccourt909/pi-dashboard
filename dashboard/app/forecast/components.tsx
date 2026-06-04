/**
 * Shared UI components for the Forecast page.
 */
import React from "react";

// ─── Stat Pill ──────────────────────────────────────────────────────────────

interface StatPillProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export function StatPill({ label, value, sub, color }: StatPillProps) {
  return (
    <div style={{ background: "#fff", border: "1px solid #dce3ea", borderRadius: 8, padding: "14px 20px", minWidth: 130 }}>
      <div style={{ fontSize: 11, color: "#7a8a99", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#1a2b3c", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#7a8a99", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2b3c" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "#7a8a99", marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Loading Spinner ────────────────────────────────────────────────────────

export function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #dce3ea", borderTop: "3px solid #1a6ca8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#7a8a99" }}>Loading from API…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Data Source Badge ──────────────────────────────────────────────────────

interface DataSourceBadgeProps {
  source: "api" | "mock";
}

export function DataSourceBadge({ source }: DataSourceBadgeProps) {
  const live = source === "api";
  return (
    <div style={{ background: live ? "#eafaf1" : "#fef9e7", border: `1px solid ${live ? "#a9dfbf" : "#f9e4b7"}`, color: live ? "#1e8449" : "#d68910", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
      <span>{live ? "●" : "◌"}</span>
      {live ? "Live API data" : "Mock fallback (API unreachable)"}
    </div>
  );
}
