"use client";

import { parseGapAnalysis } from "../parsers";
import SectionShell from "./SectionShell";

interface Props {
  text: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

function Chip({ children, kind }: { children: React.ReactNode; kind: "coral" | "slate" }) {
  const [bg, fg] = kind === "coral"
    ? ["var(--color-fill-danger)", "var(--color-status-danger)"]
    : ["var(--color-fill-neutral)", "var(--color-text-secondary)"];
  return (
    <span style={{ fontSize: "var(--font-size-label)", padding: "4px 10px", borderRadius: "var(--radius-pill)", background: bg, color: fg }}>
      {children}
    </span>
  );
}

export default function GapAnalysisView({ text, onCopy, onRegenerate }: Props) {
  const data = parseGapAnalysis(text);

  return (
    <SectionShell title="Gap Analysis" onCopy={onCopy} onRegenerate={onRegenerate}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        {/* Absent roles */}
        <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-surface-page)" }}>
          <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: 500, marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: 8 }}>
            ❌ Roles absent
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {data.absentRoles.length === 0 ? (
              <span style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-tertiary)" }}>None identified</span>
            ) : (
              data.absentRoles.map((r) => <Chip key={r} kind="coral">{r}</Chip>)
            )}
          </div>
        </div>

        {/* Undiscussed topics */}
        <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-surface-page)" }}>
          <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: 500, marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: 8 }}>
            💬 Topics not discussed
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {data.undiscussedTopics.length === 0 ? (
              <span style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-tertiary)" }}>None identified</span>
            ) : (
              data.undiscussedTopics.map((t) => <Chip key={t} kind="slate">{t}</Chip>)
            )}
          </div>
        </div>
      </div>

      {/* Suggested questions */}
      {data.suggestedQuestions.length > 0 && (
        <div style={{ marginTop: "var(--space-4)", padding: "var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-fill-info)" }}>
          <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: 500, marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: 8 }}>
            ✦ Suggested questions
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {data.suggestedQuestions.map((q, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-2)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-body)",
                }}
              >
                <span>• {q}</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(q)}
                  style={{ border: "none", background: "transparent", color: "var(--color-interactive-primary)", cursor: "pointer", fontSize: 12 }}
                  title="Copy question"
                >
                  📋
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionShell>
  );
}
