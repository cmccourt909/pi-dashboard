import React from "react";

interface Props {
  value: number; // 0–100
  status?: "healthy" | "warning" | "critical" | "unknown";
  showLabel?: boolean;
  height?: number;
}

function getSemanticColor(value: number, status?: string): string {
  if (status === "healthy") return "var(--color-success)";
  if (status === "critical") return "var(--color-danger)";
  if (status === "warning") return "var(--color-warning)";
  // Auto from value
  if (value >= 60) return "var(--color-success)";
  if (value >= 30) return "var(--color-warning)";
  return "var(--color-danger)";
}

export default function ProgressBar({
  value,
  status,
  showLabel = true,
  height = 5,
}: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = getSemanticColor(clamped, status);
  const fillWidth = Math.max(clamped, clamped > 0 ? 2 : 0); // min 4px visible

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(clamped)}% complete`}
        style={{
          flex: 1,
          height,
          background: "var(--color-indigo-100)",
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${fillWidth}%`,
            minWidth: clamped > 0 ? 4 : 0,
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 500,
            color,
            minWidth: 36,
            textAlign: "right",
            fontFeatureSettings: '"tnum" 1',
          }}
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
