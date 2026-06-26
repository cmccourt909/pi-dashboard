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
    <div style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-border-default)", borderRadius: 8, padding: "var(--space-3) var(--space-5)", minWidth: 130 }}>
      <div style={{ fontSize: "var(--font-size-label)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "var(--font-size-h1)", fontWeight: 700, color: color || "var(--color-text-primary)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 4 }}>{sub}</div>}
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
      <div style={{ fontSize: "var(--font-size-h3)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</div>
      {subtitle && <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Loading Spinner ────────────────────────────────────────────────────────

export function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid var(--color-border-default)", borderTop: "3px solid var(--color-interactive-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-secondary)" }}>Loading from API…</div>
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
    <div style={{ background: live ? "var(--color-fill-success)" : "var(--color-fill-warning)", border: `1px solid ${live ? "var(--color-status-success)" : "var(--color-status-warning)"}`, color: live ? "var(--color-status-success)" : "var(--color-status-warning)", borderRadius: 6, padding: "5px 12px", fontSize: "var(--font-size-label)", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
      <span>{live ? "●" : "◌"}</span>
      {live ? "Live API data" : "Mock fallback (API unreachable)"}
    </div>
  );
}
