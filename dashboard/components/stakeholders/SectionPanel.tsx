"use client";

import type { SectionKey, SectionState } from "./useAnalysisStream";

const SECTION_LABELS: Record<SectionKey, string> = {
  speaker_statistics: "Speaker Statistics",
  meeting_minutes: "Meeting Minutes",
  raid_log: "RAID Log",
  delivery_signals: "Delivery Signals & Priority Actions",
  team_health: "Team Health Assessment",
  gap_analysis: "Gap Analysis",
  empathy_map: "Stakeholder Empathy Maps",
  stakeholder_register: "Stakeholder Register & Influence Map",
};

interface SectionPanelProps {
  sectionKey: SectionKey;
  state: SectionState;
  onRegenerate?: () => void;
  onCopy?: () => void;
}

/**
 * SectionPanel — renders a single analysis section with streaming display,
 * status indicators, error handling, and regenerate/copy actions.
 */
export default function SectionPanel({ sectionKey, state, onRegenerate, onCopy }: SectionPanelProps) {
  const label = SECTION_LABELS[sectionKey];

  return (
    <section
      aria-label={label}
      style={{
        background: "var(--color-surface-card)",
        border: "0.5px solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-5)",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-3)",
          gap: "var(--space-3)",
        }}
      >
        <h3 style={{ margin: 0 }}>{label}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {/* Status badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: "var(--radius-pill)",
              fontSize: "var(--font-size-label)",
              fontWeight: 500,
              background:
                state.status === "complete"
                  ? "var(--color-fill-success)"
                  : state.status === "streaming"
                    ? "var(--color-fill-info)"
                    : state.status === "error"
                      ? "var(--color-fill-danger)"
                      : "var(--color-fill-neutral)",
              color:
                state.status === "complete"
                  ? "var(--color-status-success)"
                  : state.status === "streaming"
                    ? "var(--color-status-info)"
                    : state.status === "error"
                      ? "var(--color-status-danger)"
                      : "var(--color-text-secondary)",
            }}
          >
            {state.status === "streaming" ? "Analyzing…" : state.status}
          </span>

          {/* Copy button (visible when complete) */}
          {state.status === "complete" && onCopy && (
            <button
              onClick={onCopy}
              aria-label={`Copy ${label} to clipboard`}
              title="Copy to clipboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                border: "0.5px solid var(--color-border-default)",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontSize: "var(--font-size-caption)",
              }}
            >
              📋
            </button>
          )}

          {/* Regenerate button (visible when complete or error) */}
          {(state.status === "complete" || state.status === "error") && onRegenerate && (
            <button
              onClick={onRegenerate}
              aria-label={`Regenerate ${label}`}
              title="Regenerate"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                border: "0.5px solid var(--color-border-default)",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontSize: "var(--font-size-caption)",
              }}
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {/* Section Content */}
      <div
        style={{
          fontSize: "var(--font-size-body)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-normal)",
          minHeight: 48,
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
        }}
      >
        {state.status === "pending" && (
          <p style={{ color: "var(--color-text-tertiary)", fontStyle: "italic", margin: 0 }}>
            Waiting for analysis…
          </p>
        )}

        {state.status === "streaming" && (
          <>
            <div dangerouslySetInnerHTML={{ __html: markdownToBasicHtml(state.text) }} />
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 16,
                background: "var(--color-interactive-primary)",
                animation: "blink 1s step-end infinite",
                verticalAlign: "text-bottom",
                marginLeft: 2,
              }}
            />
          </>
        )}

        {state.status === "complete" && (
          <div dangerouslySetInnerHTML={{ __html: markdownToBasicHtml(state.text) }} />
        )}

        {state.status === "error" && (
          <div>
            {state.text && <div dangerouslySetInnerHTML={{ __html: markdownToBasicHtml(state.text) }} />}
            <p
              style={{
                color: "var(--color-status-danger)",
                marginTop: state.text ? "var(--space-2)" : 0,
                margin: state.text ? undefined : 0,
              }}
            >
              ❌ {state.error || "An error occurred"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Lightweight Markdown-to-HTML conversion for rendering analysis results.
 * Handles headers, tables, bold, lists — no external dependency needed.
 */
function markdownToBasicHtml(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML entities
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Headers
    .replace(/^### (.+)$/gm, '<h4 style="margin: 0.8em 0 0.3em; font-size: var(--font-size-body); font-weight: 600;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin: 1em 0 0.4em; font-size: var(--font-size-h3); font-weight: 600;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin: 1em 0 0.4em;">$1</h2>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li style="margin-left: 1.2em; list-style: disc;">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-left: 1.2em; list-style: decimal;">$1</li>')
    // Line breaks
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");

  // Simple table rendering
  if (html.includes("|")) {
    html = html.replace(
      /(<br\/>)?\|(.+?)\|(<br\/>)/g,
      (match) => match // Keep as-is for now, tables are readable in pre-wrap
    );
  }

  return html;
}
