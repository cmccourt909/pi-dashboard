import React from "react";

interface Props {
  value: number; // 0–100
  status?: "healthy" | "warning" | "critical" | "unknown";
  showLabel?: boolean;
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "var(--status-healthy)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
  unknown: "var(--status-unknown)",
};

export default function ProgressBar({
  value,
  status = "unknown",
  showLabel = true,
  height = 6,
}: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          flex: 1,
          height,
          background: "var(--track-bg)",
          borderRadius: 2,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            right: `${100 - clamped}%`,
            background: color,
            borderRadius: 2,
            transition: "right 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: clamped > 0 ? `0 0 8px ${color}60` : "none",
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: color,
            minWidth: 36,
            textAlign: "right",
            fontWeight: 600,
          }}
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
