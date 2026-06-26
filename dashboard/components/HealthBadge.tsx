import React from "react";

type Status = "healthy" | "warning" | "critical" | "unknown";

const CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  healthy: {
    label: "Healthy",
    color: "var(--color-status-success)",
    bg: "var(--color-fill-success)",
  },
  warning: {
    label: "At risk",
    color: "var(--color-status-warning)",
    bg: "var(--color-fill-warning)",
  },
  critical: {
    label: "Critical",
    color: "var(--color-status-danger)",
    bg: "var(--color-fill-danger)",
  },
  unknown: {
    label: "Unknown",
    color: "var(--color-text-secondary)",
    bg: "var(--color-fill-neutral)",
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
        borderRadius: "var(--radius-pill)",
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
