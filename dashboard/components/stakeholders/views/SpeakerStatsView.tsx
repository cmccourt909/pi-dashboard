"use client";

import { parseSpeakerStats } from "../parsers";
import VoiceBar, { SPEAKER_COLORS } from "../visualizations/VoiceBar";
import SectionShell from "./SectionShell";

interface SpeakerStatsViewProps {
  text: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

export default function SpeakerStatsView({ text, onCopy, onRegenerate }: SpeakerStatsViewProps) {
  const data = parseSpeakerStats(text);
  const topSpeaker = data.speakers[0];
  const showWarning = topSpeaker && topSpeaker.pct > 60;

  return (
    <SectionShell title="Speaker Statistics" onCopy={onCopy} onRegenerate={onRegenerate}>
      <VoiceBar speakers={data.speakers} />

      {/* Speaker grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "var(--space-2)",
          marginTop: "var(--space-4)",
        }}
      >
        {data.speakers.map((s, i) => (
          <div
            key={s.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-2)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-page)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {s.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--font-size-body)", fontWeight: 500 }}>{s.name}</div>
              {s.role && (
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.role}</div>
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{s.pct}%</div>
          </div>
        ))}
      </div>

      {/* Concentration warning */}
      {showWarning && (
        <div
          style={{
            marginTop: "var(--space-4)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-fill-warning)",
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-label)",
          }}
        >
          <span>⚠️</span>
          <div>
            <strong>Voice concentration: High.</strong> Top speaker exceeds 60% — consider rotating
            facilitation.
          </div>
        </div>
      )}

      {/* Concentration ratio */}
      {data.concentrationRatio !== null && (
        <div style={{ marginTop: "var(--space-3)", fontSize: "var(--font-size-label)", color: "var(--color-text-secondary)" }}>
          Concentration Ratio: {data.concentrationRatio.toFixed(2)}
        </div>
      )}
    </SectionShell>
  );
}
