"use client";

import { useState } from "react";
import { parseRaidLog, type RaidItem } from "../parsers";
import SectionShell from "./SectionShell";

interface Props {
  text: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

type RaidTab = "R" | "A" | "I" | "D";

const TAB_LABELS: Record<RaidTab, string> = { R: "Risks", A: "Assumptions", I: "Issues", D: "Dependencies" };

function SeverityPill({ severity }: { severity: string }) {
  const s = severity.trim().toLowerCase();
  const [bg, fg] =
    s === "high" ? ["var(--color-fill-danger)", "var(--color-status-danger)"]
    : s === "med" || s === "medium" ? ["var(--color-fill-warning)", "#9a6611"]
    : ["var(--color-fill-neutral)", "var(--color-text-secondary)"];

  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: bg, color: fg }}>
      {severity}
    </span>
  );
}

export default function RaidLogView({ text, onCopy, onRegenerate }: Props) {
  const [tab, setTab] = useState<RaidTab>("R");
  const data = parseRaidLog(text);
  const items: RaidItem[] = { R: data.risks, A: data.assumptions, I: data.issues, D: data.dependencies }[tab];

  return (
    <SectionShell title="RAID Log" onCopy={onCopy} onRegenerate={onRegenerate}>
      {/* Tab strip */}
      <div
        style={{
          display: "inline-flex",
          padding: 4,
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-page)",
          marginBottom: "var(--space-3)",
        }}
      >
        {(["R", "A", "I", "D"] as RaidTab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              fontSize: "var(--font-size-label)",
              fontWeight: 500,
              cursor: "pointer",
              background: tab === k ? "#fff" : "transparent",
              color: tab === k ? "var(--color-interactive-primary)" : "var(--color-text-secondary)",
              boxShadow: tab === k ? "var(--shadow-card)" : "none",
            }}
          >
            {TAB_LABELS[k]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 100px 110px",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-surface-page)",
            fontSize: 11,
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
          }}
        >
          <span>Item</span><span>Severity</span><span>Probability</span><span>Owner</span>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--font-size-body)", color: "var(--color-text-tertiary)" }}>
            No items found
          </div>
        ) : (
          items.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 90px 100px 110px",
                padding: "var(--space-2) var(--space-3)",
                alignItems: "center",
                fontSize: "var(--font-size-body)",
                borderTop: "1px solid var(--color-border-default)",
              }}
            >
              <span>{r.text}</span>
              <span><SeverityPill severity={r.severity} /></span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{r.probability || "—"}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "var(--color-fill-info)", color: "var(--color-interactive-primary)" }}>
                {r.owner}
              </span>
            </div>
          ))
        )}
      </div>
    </SectionShell>
  );
}
