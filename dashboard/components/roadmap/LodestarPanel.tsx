"use client";

// dashboard/components/roadmap/LodestarPanel.tsx — Phase 2 (T2.4–T2.7)
//
// Replaces Phase 1 static display with live SSE streaming.
// Phase 1 props (text, featureKey, generatedAt) preserved for backward
// compatibility; Phase 2 adds pi and active.
//
// Four visual states: idle → streaming → complete | error
// Styling matches existing inline-style pattern in the codebase.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLodestarStream } from "./hooks/useLodestarStream";
import { formatRelativeTime } from "../../lib/formatRelativeTime";

interface LodestarPanelProps {
  // Phase 1 props (unchanged — DetailDrawer passes these)
  text: string | null;
  featureKey: string;
  generatedAt?: string | null;
  // Phase 2 additions
  pi: string;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Cursor animation element
// aria-hidden — invisible to screen readers (R18.2)
// Hidden via CSS when prefers-reduced-motion is active (R18.3)
// ---------------------------------------------------------------------------
function CursorAnimation() {
  return (
    <span
      aria-hidden="true"
      className="lodestar-cursor"
      style={{
        display: "inline-block",
        width: "2px",
        height: "1em",
        backgroundColor: "#E8735A",
        marginLeft: "2px",
        verticalAlign: "text-bottom",
        animation: "lodestar-blink 1s step-end infinite",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// LodestarPanel
// ---------------------------------------------------------------------------
export default function LodestarPanel({
  text: staticFallback,
  featureKey,
  generatedAt,
  pi,
  active,
}: LodestarPanelProps) {
  const { status, text, promptVersion, error, retry, cancel } =
    useLodestarStream(pi, featureKey, active);

  // Copy-to-clipboard
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const relativeTime = formatRelativeTime(generatedAt ?? null);

  // Shared section container style — matches existing DetailDrawer section pattern
  const sectionStyle: React.CSSProperties = {
    padding: "12px 0",
    borderTop: "1px solid #e2e8f0",
  };

  const headerRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#64748b",
    margin: 0,
  };

  const textStyle: React.CSSProperties = {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#334155",
    margin: 0,
    whiteSpace: "pre-wrap",
  };

  const btnBase: React.CSSProperties = {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 4,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };

  return (
    <div role="region" aria-label="Lodestar Analysis" style={sectionStyle}>
      {/* Keyframes + reduced-motion suppression */}
      <style>{`
        @keyframes lodestar-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lodestar-cursor { display: none !important; }
        }
      `}</style>

      {/* Section header */}
      <div style={headerRowStyle}>
        <h4 style={sectionTitleStyle}>Lodestar Analysis</h4>

        {/* Contextual action button */}
        {status === "streaming" && (
          <button
            style={{ ...btnBase, color: "#94a3b8", borderColor: "#e2e8f0" }}
            onClick={cancel}
            aria-label="Cancel Lodestar narrative generation"
          >
            Cancel
          </button>
        )}
        {status === "complete" && (
          <button
            style={btnBase}
            onClick={handleCopy}
            aria-label={
              copied ? "Copied to clipboard" : "Copy narrative to clipboard"
            }
          >
            {copied ? (
              <span aria-live="polite" style={{ color: "#0d9488" }}>
                Copied
              </span>
            ) : (
              "Copy"
            )}
          </button>
        )}
        {status === "error" && (
          <button
            style={btnBase}
            onClick={retry}
            aria-label="Retry Lodestar narrative generation"
          >
            Retry
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* IDLE — show static fallback or placeholder                          */}
      {/* ------------------------------------------------------------------ */}
      {status === "idle" && (
        <>
          {staticFallback ? (
            <p data-testid="lodestar-text" style={textStyle}>
              {staticFallback}
            </p>
          ) : (
            <p
              data-testid="lodestar-placeholder"
              style={{ ...textStyle, color: "#9ca3af", fontStyle: "italic" }}
            >
              AI narrative not yet generated
            </p>
          )}
          {relativeTime && (
            <p
              data-testid="generated-at"
              style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0 0 0" }}
            >
              {relativeTime}
            </p>
          )}
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STREAMING — incremental text + cursor                               */}
      {/* ------------------------------------------------------------------ */}
      {status === "streaming" && (
        // aria-live polite + aria-atomic false: announces new chunks without
        // re-reading the full accumulated text (R18.1)
        <p
          data-testid="lodestar-streaming-text"
          style={textStyle}
          aria-live="polite"
          aria-atomic="false"
        >
          {text || (
            <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
              Generating…
            </span>
          )}
          <CursorAnimation />
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* COMPLETE — full narrative + version badge                           */}
      {/* ------------------------------------------------------------------ */}
      {status === "complete" && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            {/* Teal checkmark (R14.8) */}
            <span
              aria-label="Narrative complete"
              style={{ color: "#0d9488", fontSize: 13, fontWeight: 700 }}
            >
              ✓
            </span>
            {/* Prompt version badge (R14.8) */}
            {promptVersion && (
              <span
                aria-label={`Prompt version ${promptVersion}`}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 9999,
                  background: "#f1f5f9",
                  color: "#64748b",
                  letterSpacing: "0.03em",
                }}
              >
                {promptVersion}
              </span>
            )}
          </div>
          <p data-testid="lodestar-text" style={textStyle}>
            {text}
          </p>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ERROR — coral message + retry (retry button is in header row)       */}
      {/* ------------------------------------------------------------------ */}
      {status === "error" && (
        <p
          data-testid="lodestar-error"
          role="alert"
          style={{ ...textStyle, color: "#dc2626", fontSize: 12 }}
        >
          {error ?? "Narrative generation failed."}
        </p>
      )}
    </div>
  );
}
