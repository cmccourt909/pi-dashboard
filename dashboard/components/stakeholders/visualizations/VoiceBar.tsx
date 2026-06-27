"use client";

import type { SpeakerData } from "../parsers";

const SPEAKER_COLORS = [
  "var(--color-interactive-primary)",
  "var(--color-status-info)",
  "var(--color-status-success)",
  "var(--color-text-secondary)",
  "var(--color-status-warning)",
  "var(--color-status-danger)",
];

interface VoiceBarProps {
  speakers: SpeakerData[];
}

export default function VoiceBar({ speakers }: VoiceBarProps) {
  if (speakers.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        height: 12,
        borderRadius: "var(--radius-pill)",
        overflow: "hidden",
      }}
    >
      {speakers.map((s, i) => (
        <div
          key={s.name}
          title={`${s.name}: ${s.pct}%`}
          style={{
            width: `${s.pct}%`,
            background: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
            transition: "width 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

export { SPEAKER_COLORS };
