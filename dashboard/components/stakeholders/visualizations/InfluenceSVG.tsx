"use client";

import type { RegisterEntry } from "../parsers";

interface InfluenceSVGProps {
  stakeholders: RegisterEntry[];
}

const TIER_COLORS: Record<number, string> = {
  1: "var(--color-interactive-primary)",
  2: "var(--color-status-info)",
  3: "var(--color-status-warning)",
  4: "var(--color-text-secondary)",
};

export default function InfluenceSVG({ stakeholders }: InfluenceSVGProps) {
  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-4)",
      }}
    >
      <svg viewBox="0 0 400 320" style={{ width: "100%", height: 320 }}>
        {/* Background */}
        <rect x={40} y={20} width={340} height={260} fill="var(--color-surface-page)" rx={6} />

        {/* Grid lines */}
        <line x1={210} y1={20} x2={210} y2={280} stroke="#cdc7d2" strokeDasharray="3 3" />
        <line x1={40} y1={150} x2={380} y2={150} stroke="#cdc7d2" strokeDasharray="3 3" />

        {/* Quadrant labels */}
        <text x={50} y={38} fontSize={10} fill="var(--color-text-secondary)">KEEP SATISFIED</text>
        <text x={290} y={38} fontSize={10} fill="var(--color-interactive-primary)" fontWeight={700}>KEY PLAYERS</text>
        <text x={50} y={275} fontSize={10} fill="var(--color-text-secondary)">MONITOR</text>
        <text x={290} y={275} fontSize={10} fill="var(--color-text-secondary)">KEEP INFORMED</text>

        {/* Axis labels */}
        <text x={210} y={305} fontSize={11} fill="var(--color-text-primary)" textAnchor="middle">
          Interest →
        </text>
        <text
          x={20}
          y={150}
          fontSize={11}
          fill="var(--color-text-primary)"
          textAnchor="middle"
          transform="rotate(-90 20 150)"
        >
          Power →
        </text>

        {/* Stakeholder markers */}
        {stakeholders.map((s, idx) => {
          const cx = 40 + s.interest * 340;
          const cy = 280 - s.power * 260;
          const color = TIER_COLORS[s.tier] || TIER_COLORS[4];
          return (
            <g key={idx}>
              <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.85} />
              <text x={cx + 12} y={cy + 4} fontSize={10} fill="var(--color-text-primary)">
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
