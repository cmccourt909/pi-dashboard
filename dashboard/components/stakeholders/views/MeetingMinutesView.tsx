"use client";

import { parseMeetingMinutes } from "../parsers";
import SectionShell from "./SectionShell";

interface Props {
  text: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

function Pill({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function MeetingMinutesView({ text, onCopy, onRegenerate }: Props) {
  const data = parseMeetingMinutes(text);

  return (
    <SectionShell title="Meeting Minutes" onCopy={onCopy} onRegenerate={onRegenerate}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        {/* Decisions */}
        <div>
          <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: 500, marginBottom: "var(--space-2)" }}>Decisions</h3>
          <div style={{ border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px", padding: "var(--space-2) var(--space-3)", background: "var(--color-surface-page)", fontSize: 11, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
              <span>Decision</span><span>Owner</span>
            </div>
            {data.decisions.length === 0 ? (
              <div style={{ padding: "var(--space-3)", fontSize: "var(--font-size-body)", color: "var(--color-text-tertiary)" }}>No decisions found</div>
            ) : (
              data.decisions.map((d, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px", alignItems: "center", padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-body)", borderTop: "1px solid var(--color-border-default)" }}>
                  <span>{d.text}</span>
                  <Pill bg="var(--color-fill-info)" fg="var(--color-interactive-primary)">{d.owner}</Pill>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commitments */}
        <div>
          <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: 500, marginBottom: "var(--space-2)" }}>Commitments</h3>
          <div style={{ border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px", padding: "var(--space-2) var(--space-3)", background: "var(--color-surface-page)", fontSize: 11, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
              <span>Commitment</span><span>Owner</span><span>Due</span>
            </div>
            {data.commitments.length === 0 ? (
              <div style={{ padding: "var(--space-3)", fontSize: "var(--font-size-body)", color: "var(--color-text-tertiary)" }}>No commitments found</div>
            ) : (
              data.commitments.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px", alignItems: "center", padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-body)", borderTop: "1px solid var(--color-border-default)", gap: 4 }}>
                  <span>{c.text}</span>
                  <Pill bg="var(--color-fill-info)" fg="var(--color-interactive-primary)">{c.owner}</Pill>
                  <Pill bg="var(--color-fill-warning)" fg="#9a6611">{c.due}</Pill>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Open Questions */}
      <div style={{ marginTop: "var(--space-5)" }}>
        <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: 500, marginBottom: "var(--space-2)" }}>Open Questions</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {data.openQuestions.length === 0 ? (
            <div style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-tertiary)" }}>No open questions found</div>
          ) : (
            data.openQuestions.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", alignItems: "center", background: "var(--color-surface-page)" }}>
                <Pill bg="var(--color-fill-info)" fg="var(--color-interactive-primary)">{q.speaker}</Pill>
                <div style={{ flex: 1, fontSize: "var(--font-size-body)" }}>{q.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </SectionShell>
  );
}
