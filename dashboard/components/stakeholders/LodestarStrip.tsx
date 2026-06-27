"use client";

import type { SectionKey, SectionState } from "./useAnalysisStream";
import { parseSpeakerStats, parseRaidLog, parseGapAnalysis } from "./parsers";

interface LodestarStripProps {
  sections: Record<SectionKey, SectionState>;
}

export default function LodestarStrip({ sections }: LodestarStripProps) {
  // Only show after analysis completes (at least 3 sections done)
  const completedCount = Object.values(sections).filter((s) => s.status === "complete").length;
  if (completedCount < 3) return null;

  const insights: string[] = [];

  // Speaker concentration insight
  if (sections.speaker_statistics.status === "complete") {
    const stats = parseSpeakerStats(sections.speaker_statistics.text);
    if (stats.speakers.length > 0 && stats.speakers[0].pct > 50) {
      insights.push(
        `Voice concentration is high — ${stats.speakers[0].name} contributed ${stats.speakers[0].pct}% of speaking time.`
      );
    }
  }

  // RAID insight
  if (sections.raid_log.status === "complete") {
    const raid = parseRaidLog(sections.raid_log.text);
    const highRisks = raid.risks.filter((r) => r.severity.toLowerCase() === "high").length;
    if (highRisks > 0) {
      insights.push(`${highRisks} Tier-1 risk${highRisks > 1 ? "s" : ""} remain${highRisks === 1 ? "s" : ""} unresolved.`);
    }
  }

  // Gap analysis insight
  if (sections.gap_analysis.status === "complete") {
    const gaps = parseGapAnalysis(sections.gap_analysis.text);
    if (gaps.absentRoles.length > 0) {
      insights.push(
        `${gaps.absentRoles.length} key role${gaps.absentRoles.length > 1 ? "s are" : " is"} absent — ${gaps.absentRoles.slice(0, 3).join(", ")}.`
      );
    }
  }

  if (insights.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--color-fill-info)",
        borderLeft: "3px solid var(--color-status-info)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-4)",
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3)",
      }}
    >
      <span style={{ fontSize: 16 }}>✦</span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontWeight: 600,
            color: "var(--color-status-info)",
          }}
        >
          Lodestar Insights
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0", fontSize: "var(--font-size-body)" }}>
          {insights.map((insight, i) => (
            <li key={i} style={{ lineHeight: 1.5 }}>• {insight}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
