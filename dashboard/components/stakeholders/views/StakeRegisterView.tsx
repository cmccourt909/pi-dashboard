"use client";

import { parseStakeholderRegister } from "../parsers";
import InfluenceSVG from "../visualizations/InfluenceSVG";
import SectionShell from "./SectionShell";

interface Props {
  text: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

const TIER_STYLES: Record<number, { bg: string; fg: string }> = {
  1: { bg: "var(--color-fill-info)", fg: "var(--color-interactive-primary)" },
  2: { bg: "var(--color-fill-info)", fg: "var(--color-status-info)" },
  3: { bg: "var(--color-fill-warning)", fg: "#9a6611" },
  4: { bg: "var(--color-fill-neutral)", fg: "var(--color-text-secondary)" },
};

export default function StakeRegisterView({ text, onCopy, onRegenerate }: Props) {
  const data = parseStakeholderRegister(text);

  return (
    <SectionShell title="Stakeholder Register & Influence Map" onCopy={onCopy} onRegenerate={onRegenerate}>
      {/* Register table */}
      <div style={{ border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 60px 70px 70px 1fr",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-surface-page)",
            fontSize: 11,
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
          }}
        >
          <span>Stakeholder</span><span>Tier</span><span>Power</span><span>Interest</span><span>Engagement</span>
        </div>
        {data.stakeholders.length === 0 ? (
          <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--font-size-body)", color: "var(--color-text-tertiary)" }}>
            No stakeholders found
          </div>
        ) : (
          data.stakeholders.map((r, i) => {
            const ts = TIER_STYLES[r.tier] || TIER_STYLES[4];
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 60px 70px 70px 1fr",
                  padding: "var(--space-2) var(--space-3)",
                  alignItems: "center",
                  fontSize: "var(--font-size-body)",
                  borderTop: "1px solid var(--color-border-default)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--color-interactive-primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 500,
                    }}
                  >
                    {r.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  {r.name}
                </div>
                <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: "var(--radius-pill)", background: ts.bg, color: ts.fg }}>
                  Tier {r.tier}
                </span>
                <span>{r.power.toFixed(1)}</span>
                <span>{r.interest.toFixed(1)}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: ts.bg, color: ts.fg }}>
                  {r.strategy || "—"}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Influence Map */}
      {data.stakeholders.length > 0 && (
        <div style={{ marginTop: "var(--space-5)" }}>
          <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: 500, marginBottom: "var(--space-2)" }}>
            Influence Map — Power × Interest
          </h3>
          <InfluenceSVG stakeholders={data.stakeholders} />
        </div>
      )}
    </SectionShell>
  );
}
