"use client";

import { useState } from "react";
import { parseEmpathyMap } from "../parsers";
import SectionShell from "./SectionShell";

interface Props {
  text: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

export default function EmpathyMapView({ text, onCopy, onRegenerate }: Props) {
  const data = parseEmpathyMap(text);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeStakeholder = data.stakeholders[activeIdx];

  return (
    <SectionShell title="Stakeholder Empathy Maps" onCopy={onCopy} onRegenerate={onRegenerate}>
      {/* Stakeholder switcher */}
      {data.stakeholders.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          {data.stakeholders.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveIdx(i)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                fontSize: "var(--font-size-label)",
                border: `1px solid ${i === activeIdx ? "var(--color-interactive-primary)" : "var(--color-border-default)"}`,
                background: i === activeIdx ? "var(--color-interactive-primary)" : "transparent",
                color: i === activeIdx ? "#fff" : "var(--color-text-primary)",
                cursor: "pointer",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {activeStakeholder ? (
        <>
          {/* 2×2 grid: Says, Thinks, Does, Feels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <QuadrantCard label="Says" color="var(--color-status-info)" items={activeStakeholder.quadrants.says} />
            <QuadrantCard label="Thinks" color="var(--color-interactive-primary)" items={activeStakeholder.quadrants.thinks} />
            <QuadrantCard label="Does" color="var(--color-status-success)" items={activeStakeholder.quadrants.does} />
            <QuadrantCard label="Feels" color="var(--color-status-warning)" items={activeStakeholder.quadrants.feels} />
          </div>

          {/* Pains & Gains */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
            <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-fill-danger)" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: "var(--color-status-danger)", marginBottom: 4 }}>Pains</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "var(--font-size-body)" }}>
                {activeStakeholder.quadrants.pains.map((x, i) => <li key={i}>• {x}</li>)}
              </ul>
            </div>
            <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-fill-success)" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: "var(--color-status-success)", marginBottom: 4 }}>Gains</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "var(--font-size-body)" }}>
                {activeStakeholder.quadrants.gains.map((x, i) => <li key={i}>• {x}</li>)}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <div style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
          No empathy map data available.
        </div>
      )}
    </SectionShell>
  );
}

function QuadrantCard({ label, color, items }: { label: string; color: string; items: string[] }) {
  return (
    <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-default)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color, marginBottom: "var(--space-2)" }}>{label}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "var(--font-size-body)" }}>
        {items.length === 0 ? (
          <li style={{ color: "var(--color-text-tertiary)" }}>—</li>
        ) : (
          items.map((x, i) => <li key={i}>• {x}</li>)
        )}
      </ul>
    </div>
  );
}
