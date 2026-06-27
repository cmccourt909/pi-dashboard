"use client";

import { parseTeamHealth } from "../parsers";
import HealthGauge from "../visualizations/HealthGauge";
import SectionShell from "./SectionShell";

interface Props {
  text: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

function SubBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const color = v < 5 ? "var(--color-status-danger)" : v < 7 ? "var(--color-status-warning)" : "var(--color-status-success)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-label)", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color }}>{value !== null ? `${value}/10` : "—"}</span>
      </div>
      <div style={{ height: 8, borderRadius: "var(--radius-pill)", background: "var(--color-surface-page)" }}>
        <div style={{ height: 8, borderRadius: "var(--radius-pill)", width: `${v * 10}%`, background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

export default function TeamHealthView({ text, onCopy, onRegenerate }: Props) {
  const data = parseTeamHealth(text);

  return (
    <SectionShell title="Team Health Assessment" onCopy={onCopy} onRegenerate={onRegenerate}>
      <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "flex-start", flexWrap: "wrap" }}>
        <HealthGauge value={data.overallScore} />
        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <SubBar label="Voice Concentration" value={data.voiceConcentration} />
          <SubBar label="Facilitation Effectiveness" value={data.facilitation} />
          <SubBar label="Blocker Surfacing" value={data.blockerSurfacing} />
          <SubBar label="Agile Maturity" value={data.agileMaturity} />
        </div>
      </div>

      {data.recommendation && (
        <div
          style={{
            marginTop: "var(--space-5)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-fill-info)",
            borderLeft: "3px solid var(--color-status-info)",
            display: "flex",
            gap: "var(--space-3)",
            fontSize: "var(--font-size-body)",
          }}
        >
          <span>✦</span>
          <div>{data.recommendation}</div>
        </div>
      )}
    </SectionShell>
  );
}
