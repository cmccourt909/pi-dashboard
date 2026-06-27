"use client";

import type { SectionKey, SectionState } from "./useAnalysisStream";
import { parseSpeakerStats, parseRaidLog, parseTeamHealth, parseStakeholderRegister } from "./parsers";

interface KPISummaryProps {
  sections: Record<SectionKey, SectionState>;
}

interface KPICardProps {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}

function KPICard({ label, value, accent = "var(--color-text-primary)", sub }: KPICardProps) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 150,
        background: "var(--color-surface-card)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-4)",
      }}
    >
      <div style={{ fontSize: "var(--font-size-label)", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 28, fontWeight: 700, lineHeight: 1, color: accent }}>{value}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 4, color: "var(--color-text-secondary)" }}>{sub}</div>}
    </div>
  );
}

export default function KPISummary({ sections }: KPISummaryProps) {
  // Only show if at least one section is complete
  const anyComplete = Object.values(sections).some((s) => s.status === "complete");
  if (!anyComplete) return null;

  // Extract values from completed sections
  const registerText = sections.stakeholder_register.text;
  const raidText = sections.raid_log.text;
  const healthText = sections.team_health.text;

  const register = registerText ? parseStakeholderRegister(registerText) : { stakeholders: [] };
  const raid = raidText ? parseRaidLog(raidText) : { risks: [], assumptions: [], issues: [], dependencies: [] };
  const health = healthText ? parseTeamHealth(healthText) : { overallScore: null, voiceConcentration: null, facilitation: null, blockerSurfacing: null, agileMaturity: null, recommendation: "" };

  const stakeholderCount = register.stakeholders.length;
  const tier1Count = register.stakeholders.filter((s) => s.tier === 1).length;
  const criticalRisks = raid.risks.filter((r) => r.severity.toLowerCase() === "high").length;
  const atRiskDeps = raid.dependencies.filter((d) => d.probability?.toLowerCase().includes("risk") || d.probability?.toLowerCase().includes("delay")).length;
  const healthScore = health.overallScore;

  const healthColor = healthScore === null ? "var(--color-text-secondary)"
    : healthScore < 5 ? "var(--color-status-danger)"
    : healthScore < 7 ? "var(--color-status-warning)"
    : "var(--color-status-success)";

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
      <KPICard label="Stakeholders identified" value={stakeholderCount || "—"} />
      <KPICard label="Tier 1 key players" value={tier1Count || "—"} accent="var(--color-interactive-primary)" />
      <KPICard label="Critical risks" value={criticalRisks} accent="var(--color-status-danger)" sub={criticalRisks > 0 ? "Require attention" : undefined} />
      <KPICard label="At-risk dependencies" value={atRiskDeps} accent="var(--color-status-warning)" />
      <KPICard label="Team Health" value={healthScore !== null ? `${healthScore}/10` : "—"} accent={healthColor} sub={healthScore !== null && healthScore < 5 ? "Below threshold" : undefined} />
    </div>
  );
}
