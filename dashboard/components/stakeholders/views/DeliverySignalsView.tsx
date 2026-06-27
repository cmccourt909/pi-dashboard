"use client";

import { parseDeliverySignals, type ActionItem } from "../parsers";
import SectionShell from "./SectionShell";

interface Props {
  text: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

function PriorityColumn({ header, color, bg, items }: { header: string; color: string; bg: string; items: ActionItem[] }) {
  return (
    <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-default)", overflow: "hidden" }}>
      <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-label)", fontWeight: 600, background: bg, color }}>{header}</div>
      {items.length === 0 ? (
        <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--font-size-label)", color: "var(--color-text-secondary)" }}>
          <div style={{ fontSize: 24, marginBottom: "var(--space-2)" }}>💬</div>
          No actions detected
        </div>
      ) : (
        <div style={{ padding: "var(--space-2)" }}>
          {items.map((item, i) => (
            <div key={i} style={{ padding: "var(--space-2)", borderBottom: i < items.length - 1 ? "1px solid var(--color-border-default)" : "none", fontSize: "var(--font-size-body)" }}>
              <div style={{ fontWeight: 500 }}>{item.description}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {item.owner} · {item.rationale}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DeliverySignalsView({ text, onCopy, onRegenerate }: Props) {
  const data = parseDeliverySignals(text);
  const noP1 = data.p1.length === 0;

  return (
    <SectionShell title="Delivery Signals & Priority Actions" onCopy={onCopy} onRegenerate={onRegenerate}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)" }}>
        <PriorityColumn header="P1 Now" color="var(--color-status-danger)" bg="var(--color-fill-danger)" items={data.p1} />
        <PriorityColumn header="P2 Next" color="#9a6611" bg="var(--color-fill-warning)" items={data.p2} />
        <PriorityColumn header="P3 Later" color="var(--color-text-secondary)" bg="var(--color-fill-neutral)" items={data.p3} />
      </div>

      {noP1 && (
        <div style={{ marginTop: "var(--space-4)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-fill-info)", display: "flex", alignItems: "flex-start", gap: "var(--space-2)", fontSize: "var(--font-size-label)" }}>
          <span>✦</span>
          <div>Lodestar didn't find clear action commitments in this transcript. Re-upload with speaker attribution enabled to improve detection.</div>
        </div>
      )}
    </SectionShell>
  );
}
