import React from "react";

type Status = "healthy" | "warning" | "critical" | "unknown";

const CONFIG: Record<Status, { label: string; color: string; dot: string }> = {
  healthy: {
    label: "HEALTHY",
    color: "var(--status-healthy)",
    dot: "#22c55e",
  },
  warning: {
    label: "AT RISK",
    color: "var(--status-warning)",
    dot: "#f59e0b",
  },
  critical: {
    label: "CRITICAL",
    color: "var(--status-critical)",
    dot: "#ef4444",
  },
  unknown: {
    label: "UNKNOWN",
    color: "var(--status-unknown)",
    dot: "#6b7280",
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
        border: `1px solid ${cfg.color}`,
        color: cfg.color,
        fontSize: isSmall ? "9px" : "10px",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        letterSpacing: "0.12em",
        borderRadius: "2px",
        background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
      }}
    >
      <span
        style={{
          width: isSmall ? 5 : 6,
          height: isSmall ? 5 : 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
          boxShadow: `0 0 4px ${cfg.dot}`,
        }}
      />
      {cfg.label}
    </span>
  );
}
