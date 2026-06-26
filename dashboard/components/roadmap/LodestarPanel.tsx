"use client";

import { useEffect, useRef, useState } from "react";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import {
  hasStructuredSections,
  NarrativeSections,
  parseSections,
} from "./parseSections";
import { useLodestarStream } from "./useLodestarStream";

/**
 * LodestarPanel displays AI-generated delivery narrative text within the Detail Drawer.
 *
 * Supports:
 *   - Rendering cached plain-text or structured narratives
 *   - On-demand SSE streaming regeneration via the Lodestar endpoint
 *   - Structured rendering of Delivery Status / Risks & Blockers / Recommended Actions
 *
 * Requirements: 7.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.3, 10.4, 10.6
 */

interface LodestarPanelProps {
  text: string | null;
  featureKey: string;
  generatedAt?: string | null;
  pi?: string | null;
}

const SECTION_STYLES: Record<keyof NarrativeSections, { border: string; icon: string }> = {
  deliveryStatus: {
    border: "var(--color-status-success)",
    icon: "●",
  },
  risksAndBlockers: {
    border: "var(--color-status-warning)",
    icon: "⚠",
  },
  recommendedActions: {
    border: "var(--color-interactive-secondary)",
    icon: "→",
  },
};

const SECTION_TITLES: Record<keyof NarrativeSections, string> = {
  deliveryStatus: "Delivery Status",
  risksAndBlockers: "Risks & Blockers",
  recommendedActions: "Recommended Actions",
};

export default function LodestarPanel({
  text,
  featureKey,
  generatedAt,
  pi,
}: LodestarPanelProps) {
  const [narrativeText, setNarrativeText] = useState<string | null>(text);
  const [timestamp, setTimestamp] = useState<string | null>(
    generatedAt ?? null
  );
  const [error, setError] = useState<string | null>(null);

  const { state, text: streamedText, error: streamError, start, reset } = useLodestarStream();

  // Sync parent-provided text when it changes (e.g., drawer reopens).
  useEffect(() => {
    setNarrativeText(text);
    setTimestamp(generatedAt ?? null);
    setError(null);
    reset();
  }, [text, generatedAt, reset]);

  // Auto-generate: when the panel mounts with no cached narrative, start streaming.
  // This restores the previous build's behaviour of auto-generating on drawer open.
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (!hasAutoStarted.current && !text && pi && featureKey && state === "idle") {
      hasAutoStarted.current = true;
      start(pi, featureKey);
    }
  }, [text, pi, featureKey, state, start]);

  // Finalize streamed text when the stream completes.
  useEffect(() => {
    if (state === "complete" && streamedText) {
      setNarrativeText(streamedText);
      setTimestamp(new Date().toISOString());
    }
  }, [state, streamedText]);

  // Surface stream errors.
  useEffect(() => {
    if (streamError) {
      setError(streamError);
    }
  }, [streamError]);

  const isLoading = state === "loading" || state === "streaming";

  function handleRegenerate() {
    setError(null);
    const piName = pi ?? "26.2";
    start(piName, featureKey);
  }

  const relativeTime = formatRelativeTime(timestamp);

  const displayText = state === "streaming" || state === "complete"
    ? streamedText || narrativeText
    : narrativeText;

  const sections = displayText ? parseSections(displayText) : null;
  const structured = displayText ? hasStructuredSections(displayText) : false;

  return (
    <div
      role="region"
      aria-label="Lodestar Analysis"
      style={{
        padding: "12px 0",
        borderTop: "1px solid var(--color-border-default)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <h4
          style={{
            fontSize: "var(--font-size-label)",
            fontWeight: "var(--font-weight-semi)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--color-text-secondary)",
            margin: 0,
          }}
        >
          Lodestar Analysis
        </h4>
        <button
          data-testid="regenerate-button"
          onClick={handleRegenerate}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label="Regenerate narrative"
          style={{
            fontSize: "var(--font-size-label)",
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: isLoading ? "var(--color-fill-neutral)" : "var(--color-surface-card)",
            color: isLoading ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {isLoading && (
            <span
              data-testid="loading-indicator"
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                border: "2px solid var(--color-border-default)",
                borderTopColor: "var(--color-text-secondary)",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
          )}
          {isLoading ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      {displayText ? (
        structured && sections ? (
          <div data-testid="lodestar-structured">
            {(Object.keys(SECTION_TITLES) as Array<keyof NarrativeSections>).map(
              (key) => {
                const body = sections[key];
                if (!body) return null;
                const style = SECTION_STYLES[key];
                return (
                  <div
                    key={key}
                    data-testid={`lodestar-section-${key}`}
                    style={{
                      marginBottom: 10,
                      paddingLeft: 10,
                      borderLeft: `3px solid ${style.border}`,
                    }}
                  >
                    <h5
                      style={{
                        fontSize: "var(--font-size-label)",
                        fontWeight: "var(--font-weight-semi)",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        color: style.border,
                        margin: "0 0 4px 0",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span aria-hidden="true">{style.icon}</span>
                      {SECTION_TITLES[key]}
                    </h5>
                    <p
                      style={{
                        fontSize: "var(--font-size-body)",
                        lineHeight: "var(--line-height-normal)",
                        color: "var(--color-text-primary)",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {body}
                    </p>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <p
            data-testid="lodestar-text"
            style={{
              fontSize: "var(--font-size-body)",
              lineHeight: "var(--line-height-normal)",
              color: "var(--color-text-primary)",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {displayText}
          </p>
        )
      ) : (
        <p
          data-testid="lodestar-placeholder"
          style={{
            fontSize: "var(--font-size-body)",
            lineHeight: "var(--line-height-normal)",
            color: "var(--color-text-tertiary)",
            margin: 0,
            fontStyle: "italic",
          }}
        >
          AI narrative not yet generated
        </p>
      )}

      {error && (
        <p
          data-testid="regenerate-error"
          role="alert"
          style={{
            fontSize: "var(--font-size-caption)",
            color: "var(--color-status-danger)",
            margin: "8px 0 0 0",
          }}
        >
          {error}
        </p>
      )}

      {relativeTime && !error && (
        <p
          data-testid="generated-at"
          style={{
            fontSize: "var(--font-size-label)",
            color: "var(--color-text-tertiary)",
            margin: "6px 0 0 0",
          }}
        >
          {relativeTime}
        </p>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
