"use client";

import { useState } from "react";
import { formatRelativeTime } from "../../lib/formatRelativeTime";

/**
 * LodestarPanel displays AI-generated delivery narrative text within the Detail Drawer.
 *
 * Shows "AI narrative not yet generated" placeholder when lodestar_static is null.
 * Provides a "Regenerate" button to trigger on-demand narrative regeneration.
 *
 * Requirements: 7.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

interface LodestarPanelProps {
  text: string | null;
  featureKey: string;
  generatedAt?: string | null;
}

export default function LodestarPanel({
  text,
  featureKey,
  generatedAt,
}: LodestarPanelProps) {
  const [narrativeText, setNarrativeText] = useState<string | null>(text);
  const [timestamp, setTimestamp] = useState<string | null>(
    generatedAt ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/features/${featureKey}/narrative/generate`,
        { method: "POST" }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.detail ||
          errorData?.error ||
          `Regeneration failed (${response.status})`;
        setError(message);
        return;
      }

      const data = await response.json();
      setNarrativeText(data.narrative_text);
      setTimestamp(data.generated_at);
    } catch (err) {
      setError("Network error — unable to regenerate narrative.");
    } finally {
      setIsLoading(false);
    }
  }

  const relativeTime = formatRelativeTime(timestamp);

  return (
    <div
      role="region"
      aria-label="Lodestar Analysis"
      style={{
        padding: "12px 0",
        borderTop: "1px solid #e2e8f0",
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
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#64748b",
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
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 4,
            border: "1px solid #cbd5e1",
            background: isLoading ? "#f1f5f9" : "#ffffff",
            color: isLoading ? "#94a3b8" : "#475569",
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
                border: "2px solid #cbd5e1",
                borderTopColor: "#475569",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
          )}
          {isLoading ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      {narrativeText ? (
        <p
          data-testid="lodestar-text"
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "#334155",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {narrativeText}
        </p>
      ) : (
        <p
          data-testid="lodestar-placeholder"
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "#9ca3af",
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
            fontSize: 12,
            color: "#dc2626",
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
            fontSize: 11,
            color: "#94a3b8",
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
