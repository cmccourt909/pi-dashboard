import React from "react";

type Status = "healthy" | "warning" | "critical" | "unknown";

const CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  healthy: {
    label: "Healthy",
    color: "var(--color-success)",
    bg: "var(--color-success-bg)",
  },
  warning: {
    label: "At risk",
    color: "var(--color-warning)",
    bg: "var(--color-warning-bg)",
  },
  critical: {
    label: "Critical",
    color: "var(--color-danger)",
    bg: "var(--color-danger-bg)",
  },
  unknown: {
    label: "Unknown",
    color: "var(--color-text-muted)",
    bg: "var(--color-indigo-50)",
  },
};

interface Props {
  status: Status;
}

export default function HealthBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.unknown;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "2px 10px",
        color: cfg.color,
        fontSize: 11,
        fontWeight: 500,
        borderRadius: "var(--radius-full)",
        background: cfg.bg,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.color,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}
