"use client";

import type { SectionKey, SectionStatus } from "./useAnalysisStream";

interface SectionRailProps {
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
  statuses: Record<SectionKey, SectionStatus>;
}

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "speaker_statistics", label: "Speaker Statistics", icon: "👥" },
  { key: "meeting_minutes", label: "Meeting Minutes", icon: "📄" },
  { key: "raid_log", label: "RAID Log", icon: "⚠️" },
  { key: "delivery_signals", label: "Delivery Signals", icon: "📊" },
  { key: "team_health", label: "Team Health", icon: "❤️" },
  { key: "gap_analysis", label: "Gap Analysis", icon: "🧩" },
  { key: "empathy_map", label: "Empathy Map", icon: "💬" },
  { key: "stakeholder_register", label: "Stakeholder Register", icon: "🔗" },
];

const STATUS_COLORS: Record<SectionStatus, string> = {
  complete: "var(--color-status-success)",
  streaming: "var(--color-status-info)",
  error: "var(--color-status-danger)",
  pending: "var(--color-text-tertiary)",
};

export default function SectionRail({ active, onSelect, statuses }: SectionRailProps) {
  return (
    <aside style={{ width: 220, flexShrink: 0 }}>
      <div
        style={{
          background: "var(--color-surface-card)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-2)",
          position: "sticky",
          top: 80,
        }}
      >
        {SECTIONS.map((s) => {
          const isActive = active === s.key;
          const status = statuses[s.key];
          return (
            <button
              key={s.key}
              onClick={() => onSelect(s.key)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "none",
                textAlign: "left",
                fontSize: "var(--font-size-body)",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "background 0.15s",
                background: isActive ? "var(--color-fill-info)" : "transparent",
                color: isActive ? "var(--color-interactive-primary)" : "var(--color-text-primary)",
              }}
            >
              <span style={{ width: 20, textAlign: "center", fontSize: 14 }}>{s.icon}</span>
              <span style={{ flex: 1 }}>{s.label}</span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: STATUS_COLORS[status],
                  flexShrink: 0,
                }}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
