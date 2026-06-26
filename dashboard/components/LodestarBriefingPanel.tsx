"use client";

import { IconFileText } from "@tabler/icons-react";

export interface LodestarBriefingPanelProps {
  onGenerate?: () => void;
  loading?: boolean;
}

/**
 * LodestarBriefingPanel is an executive briefing CTA panel.
 *
 * Spec: Wave 4.3
 * - Indigo "Generate Briefing" primary button
 * - Placeholder generation action until scope defined
 */
export default function LodestarBriefingPanel({
  onGenerate,
  loading = false,
}: LodestarBriefingPanelProps) {
  return (
    <div
      data-testid="lodestar-briefing-panel"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-md)",
            background: "var(--color-fill-info)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-interactive-primary)",
            flexShrink: 0,
          }}
        >
          <IconFileText size={22} stroke={1.5} />
        </div>
        <div>
          <h3
            style={{
              fontSize: "var(--font-size-h3)",
              fontWeight: "var(--font-weight-semi)",
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Executive Briefing
          </h3>
          <p
            style={{
              fontSize: "var(--font-size-caption)",
              color: "var(--color-text-secondary)",
              margin: 0,
              marginTop: "var(--space-1)",
            }}
          >
            Generate a one-page summary of delivery status, risks, and recommended actions.
          </p>
        </div>
      </div>

      <button
        type="button"
        data-testid="generate-briefing"
        onClick={onGenerate}
        disabled={loading}
        aria-busy={loading}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-2)",
          minHeight: 44,
          padding: "var(--space-2) var(--space-4)",
          border: "none",
          borderRadius: "var(--radius-md)",
          background: "var(--color-interactive-primary)",
          color: "var(--color-text-inverse)",
          fontSize: "var(--font-size-body)",
          fontWeight: "var(--font-weight-medium)",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          transition: "opacity 100ms ease",
        }}
      >
        {loading ? "Generating…" : "Generate Briefing"}
      </button>
    </div>
  );
}
