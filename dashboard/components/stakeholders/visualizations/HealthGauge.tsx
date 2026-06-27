"use client";

interface HealthGaugeProps {
  value: number | null;
  max?: number;
}

export default function HealthGauge({ value, max = 10 }: HealthGaugeProps) {
  const displayValue = value ?? 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = displayValue / max;
  const color = pct < 0.5 ? "var(--color-status-danger)" : pct < 0.7 ? "var(--color-status-warning)" : "var(--color-status-success)";

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={r} stroke="#eee" strokeWidth={10} fill="none" />
        <circle
          cx={60}
          cy={60}
          r={r}
          stroke={color}
          strokeWidth={10}
          fill="none"
          strokeDasharray={`${c * pct} ${c}`}
          transform="rotate(-90 60 60)"
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        <text x={60} y={58} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--color-text-primary)">
          {value ?? "—"}
        </text>
        <text x={60} y={76} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)">
          / {max}
        </text>
      </svg>
      {value !== null && (
        <div style={{ fontSize: "var(--font-size-label)", marginTop: 4, color }}>
          {pct < 0.5 ? "Below threshold" : pct < 0.7 ? "Needs improvement" : "Healthy"}
        </div>
      )}
    </div>
  );
}
