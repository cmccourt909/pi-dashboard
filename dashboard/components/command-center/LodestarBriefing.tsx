"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

export interface LodestarBriefingProps {
  initialNarrative?: string;
  version?: string;
  lastUpdated?: string;
  /** PI identifier for the SSE endpoint */
  piId?: string;
  /** Feature key for the SSE endpoint */
  featureKey?: string;
}

interface BriefingState {
  headline: string;
  narrative: string;
  version: string;
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * LodestarBriefing displays the AI-generated narrative briefing panel.
 * It streams content via SSE from the Lodestar endpoint and provides
 * action buttons for SteerCo generation, refresh, and clipboard copy.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 10.3
 */
export default function LodestarBriefing({
  initialNarrative = "",
  version = "1.0",
  lastUpdated = "",
  piId = "current",
  featureKey = "overview",
}: LodestarBriefingProps) {
  const [state, setState] = useState<BriefingState>({
    headline: "",
    narrative: initialNarrative,
    version,
    lastUpdated,
    isLoading: !initialNarrative,
    error: null,
  });

  const [copySuccess, setCopySuccess] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const sseUrl = `/api/pis/${piId}/features/${featureKey}/lodestar`;

  const startStream = useCallback(() => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      headline: "",
      narrative: "",
      isLoading: true,
      error: null,
    }));

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          headline: data.headline ?? prev.headline,
          narrative: data.narrative
            ? prev.narrative + data.narrative
            : prev.narrative,
          version: data.version ?? prev.version,
          lastUpdated: data.lastUpdated ?? prev.lastUpdated,
          isLoading: false,
        }));
      } catch {
        // If not JSON, treat as raw narrative text
        setState((prev) => ({
          ...prev,
          narrative: prev.narrative + event.data,
          isLoading: false,
        }));
      }
    };

    es.addEventListener("done", () => {
      es.close();
      eventSourceRef.current = null;
      setState((prev) => ({ ...prev, isLoading: false }));
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Unable to load briefing. Please try again.",
      }));
    };
  }, [sseUrl]);

  useEffect(() => {
    if (!initialNarrative) {
      startStream();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [startStream, initialNarrative]);

  const handleCopy = async () => {
    const textToCopy = `${state.headline}\n\n${state.narrative}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setState((prev) => ({
        ...prev,
        error: "Failed to copy — please copy manually.",
      }));
    }
  };

  const handleRefresh = () => {
    startStream();
  };

  const handleGenerateSteerCo = () => {
    // Placeholder action for SteerCo briefing generation
    // Will be implemented in a future task
  };

  return (
    <section
      data-testid="lodestar-briefing"
      style={{
        background: "var(--color-surface-card, #ffffff)",
        borderRadius: "var(--radius-lg, 12px)",
        boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.1))",
        padding: "var(--space-6, 24px)",
        marginBottom: "var(--space-6, 24px)",
      }}
    >
      {/* Version badge and timestamp header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-4, 16px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2, 8px)" }}>
          <span
            data-testid="version-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-1, 4px)",
              padding: "2px 10px",
              borderRadius: "var(--radius-pill, 999px)",
              backgroundColor: "var(--color-brand-indigo, #4f46e5)",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Lodestar AI
            <span
              style={{
                opacity: 0.8,
                fontWeight: 400,
                marginLeft: 4,
              }}
            >
              v{state.version}
            </span>
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary, #6b7280)",
              fontWeight: 500,
            }}
          >
            Portfolio briefing
          </span>
        </div>

        {state.lastUpdated && (
          <span
            data-testid="update-timestamp"
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary, #6b7280)",
            }}
          >
            Updated {formatTimestamp(state.lastUpdated)}
          </span>
        )}
      </div>

      {/* Content area */}
      {state.isLoading && <SkeletonPlaceholder />}

      {state.error && !state.isLoading && (
        <div
          data-testid="briefing-error"
          style={{
            padding: "var(--space-4, 16px)",
            borderRadius: "var(--radius-md, 8px)",
            backgroundColor: "var(--color-fill-danger, #fef2f2)",
            color: "var(--color-status-danger, #dc2626)",
            fontSize: 14,
            marginBottom: "var(--space-4, 16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{state.error}</span>
          <button
            onClick={handleRefresh}
            data-testid="retry-button"
            style={{
              background: "none",
              border: "1px solid var(--color-status-danger, #dc2626)",
              borderRadius: "var(--radius-md, 8px)",
              color: "var(--color-status-danger, #dc2626)",
              padding: "4px 12px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!state.isLoading && !state.error && (
        <div data-testid="briefing-content">
          {state.headline && (
            <h2
              data-testid="briefing-headline"
              style={{
                margin: "0 0 var(--space-3, 12px) 0",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--color-text-primary, #1f2937)",
                lineHeight: 1.4,
              }}
            >
              {state.headline}
            </h2>
          )}

          {state.narrative && (
            <div
              data-testid="briefing-narrative"
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--color-text-primary, #374151)",
              }}
            >
              {state.narrative.split("\n\n").map((paragraph, idx) => (
                <p
                  key={idx}
                  style={{
                    margin: "0 0 var(--space-3, 12px) 0",
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-3, 12px)",
          marginTop: "var(--space-4, 16px)",
          borderTop: "1px solid var(--color-border, #e5e7eb)",
          paddingTop: "var(--space-4, 16px)",
        }}
      >
        <button
          onClick={handleGenerateSteerCo}
          data-testid="btn-generate-steerco"
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-md, 8px)",
            backgroundColor: "var(--color-brand-indigo, #4f46e5)",
            color: "#ffffff",
            border: "none",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Generate SteerCo briefing
        </button>

        <button
          onClick={handleRefresh}
          data-testid="btn-refresh"
          disabled={state.isLoading}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-md, 8px)",
            backgroundColor: "transparent",
            color: "var(--color-text-primary, #374151)",
            border: "1px solid var(--color-border, #e5e7eb)",
            fontSize: 13,
            fontWeight: 500,
            cursor: state.isLoading ? "not-allowed" : "pointer",
            opacity: state.isLoading ? 0.6 : 1,
          }}
        >
          Refresh analysis
        </button>

        <button
          onClick={handleCopy}
          data-testid="btn-copy"
          disabled={!state.narrative && !state.headline}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-md, 8px)",
            backgroundColor: "transparent",
            color: "var(--color-text-primary, #374151)",
            border: "1px solid var(--color-border, #e5e7eb)",
            fontSize: 13,
            fontWeight: 500,
            cursor: !state.narrative && !state.headline ? "not-allowed" : "pointer",
            opacity: !state.narrative && !state.headline ? 0.6 : 1,
          }}
        >
          {copySuccess ? "Copied!" : "Copy"}
        </button>
      </div>
    </section>
  );
}

/** Skeleton loading placeholders shown while streaming. */
function SkeletonPlaceholder() {
  return (
    <div data-testid="briefing-skeleton" style={{ marginBottom: "var(--space-4, 16px)" }}>
      {/* Headline skeleton */}
      <div
        style={{
          height: 20,
          width: "60%",
          borderRadius: "var(--radius-md, 8px)",
          backgroundColor: "var(--color-fill-muted, #f3f4f6)",
          marginBottom: "var(--space-3, 12px)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      {/* Paragraph skeletons */}
      <div
        style={{
          height: 14,
          width: "100%",
          borderRadius: "var(--radius-md, 8px)",
          backgroundColor: "var(--color-fill-muted, #f3f4f6)",
          marginBottom: "var(--space-2, 8px)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 14,
          width: "90%",
          borderRadius: "var(--radius-md, 8px)",
          backgroundColor: "var(--color-fill-muted, #f3f4f6)",
          marginBottom: "var(--space-2, 8px)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 14,
          width: "75%",
          borderRadius: "var(--radius-md, 8px)",
          backgroundColor: "var(--color-fill-muted, #f3f4f6)",
          marginBottom: "var(--space-2, 8px)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

/** Formats an ISO timestamp or date string into a human-readable form. */
function formatTimestamp(timestamp: string): string {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}
