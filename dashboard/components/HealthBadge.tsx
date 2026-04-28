import React from "react";

type Status = "healthy" | "warning" | "critical" | "unknown";

const CONFIG: Record<
  Status,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  healthy: {
    label: "HEALTHY",
    color: "var(--status-healthy)",
    bg: "var(--status-healthy-bg)",
    border: "var(--status-healthy-border)",
    dot: "var(--status-healthy)",
  },
  warning: {
    label: "AT RISK",
    color: "var(--status-warning)",
    bg: "var(--status-warning-bg)",
    border: "var(--status-warning-border)",
    dot: "var(--status-warning)",
  },
  critical: {
    label: "CRITICAL",
    color: "var(--status-critical)",
    bg: "var(--status-critical-bg)",
    border: "var(--status-critical-border)",
    dot: "var(--status-critical)",
  },
  unknown: {
    label: "UNKNOWN",
    color: "var(--text-muted)",
    bg: "var(--bg-card)",
    border: "var(--border)",
    dot: "var(--text-muted)",
  },
};

interface Props {
  status: Status;
  size?: "sm" | "md";
}

export default function HealthBadge({ status, size = "md" }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.unknown;
  const isSmall = size === "sm";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? "4px" : "6px",
        padding: isSmall ? "2px 7px" : "3px 10px",
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: isSmall ? "9px" : "10px",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        letterSpacing: "0.1em",
        borderRadius: "3px",
        background: cfg.bg,
      }}
    >
      <span
        style={{
          width: isSmall ? 5 : 6,
          height: isSmall ? 5 : 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}
