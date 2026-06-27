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
  // Dynamic radius: smaller dots when more stakeholders
  const dotRadius = stakeholders.length > 8 ? 6 : stakeholders.length > 5 ? 7 : 9;

  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-4)",
      }}
    >
      <svg
        viewBox="0 0 500 400"
        style={{ width: "100%", height: "auto", display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect x={50} y={20} width={420} height={330} fill="var(--color-surface-page)" rx={6} />

        {/* Grid lines */}
        <line x1={260} y1={20} x2={260} y2={350} stroke="#cdc7d2" strokeDasharray="3 3" />
        <line x1={50} y1={185} x2={470} y2={185} stroke="#cdc7d2" strokeDasharray="3 3" />

        {/* Quadrant labels */}
        <text x={60} y={38} fontSize={10} fill="var(--color-text-secondary)">KEEP SATISFIED</text>
        <text x={350} y={38} fontSize={10} fill="var(--color-interactive-primary)" fontWeight={700}>KEY PLAYERS</text>
        <text x={60} y={345} fontSize={10} fill="var(--color-text-secondary)">MONITOR</text>
        <text x={350} y={345} fontSize={10} fill="var(--color-text-secondary)">KEEP INFORMED</text>

        {/* Axis labels */}
        <text x={260} y={380} fontSize={11} fill="var(--color-text-primary)" textAnchor="middle">
          Interest →
        </text>
        <text
          x={25}
          y={185}
          fontSize={11}
          fill="var(--color-text-primary)"
          textAnchor="middle"
          transform="rotate(-90 25 185)"
        >
          Power →
        </text>

        {/* Stakeholder markers */}
        {stakeholders.map((s, idx) => {
          const cx = 50 + s.interest * 420;
          const cy = 350 - s.power * 330;
          const color = TIER_COLORS[s.tier] || TIER_COLORS[4];
          return (
            <g key={idx}>
              <circle cx={cx} cy={cy} r={dotRadius} fill={color} opacity={0.85} />
              <text x={cx + dotRadius + 4} y={cy + 4} fontSize={10} fill="var(--color-text-primary)">
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
