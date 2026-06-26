"use client";

import { useCallback, useState } from "react";
import LodestarBriefingPanel from "./LodestarBriefingPanel";
import AskLodestar from "./AskLodestar";

/**
 * Client wrapper that wires up the Generate Briefing and Ask Lodestar
 * buttons with actual API calls.
 */
export default function LodestarActions() {
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingResult, setBriefingResult] = useState<string | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [askInput, setAskInput] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askResult, setAskResult] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const handleGenerateBriefing = useCallback(async () => {
    setBriefingLoading(true);
    setBriefingError(null);
    setBriefingResult(null);

    try {
      // Fetch current findings to feed the briefing endpoint
      const findingsRes = await fetch("/api/findings");
      if (!findingsRes.ok) throw new Error("Failed to fetch findings");
      const findings = await findingsRes.json();

      const res = await fetch("/api/enrich/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findings }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Briefing generation failed" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setBriefingResult(data.executive_summary || data.risk_headline || "Briefing generated.");
    } catch (e) {
      setBriefingError(e instanceof Error ? e.message : "Briefing generation failed");
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  const handleAskLodestar = useCallback(() => {
    setAskOpen((prev) => !prev);
    setAskResult(null);
    setAskError(null);
  }, []);

  const handleAskSubmit = useCallback(async () => {
    if (!askInput.trim()) return;
    setAskLoading(true);
    setAskError(null);
    setAskResult(null);

    try {
      // Use the briefing endpoint as a general-purpose query for now
      const findingsRes = await fetch("/api/findings");
      const findings = findingsRes.ok ? await findingsRes.json() : [];

      const res = await fetch("/api/enrich/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findings,
          context: { program_name: askInput.trim() },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setAskResult(data.executive_summary || data.risk_headline || "No response generated.");
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setAskLoading(false);
    }
  }, [askInput]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <LodestarBriefingPanel onGenerate={handleGenerateBriefing} loading={briefingLoading} />

      {briefingResult && (
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            fontSize: "var(--font-size-body)",
            color: "var(--color-text-primary)",
            lineHeight: "var(--line-height-normal)",
            whiteSpace: "pre-wrap",
          }}
        >
          {briefingResult}
        </div>
      )}

      {briefingError && (
        <p style={{ fontSize: "var(--font-size-caption)", color: "var(--color-status-danger)", margin: 0 }}>
          {briefingError}
        </p>
      )}

      <AskLodestar onClick={handleAskLodestar} label={askOpen ? "Close" : "Ask Lodestar"} />

      {askOpen && (
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <label
            htmlFor="ask-lodestar-input"
            style={{ fontSize: "var(--font-size-caption)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-secondary)" }}
          >
            Ask a question about your delivery data
          </label>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              id="ask-lodestar-input"
              type="text"
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAskSubmit(); }}
              placeholder="e.g. What are the top risks this sprint?"
              disabled={askLoading}
              style={{
                flex: 1,
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-body)",
                color: "var(--color-text-primary)",
                background: "var(--color-surface-card)",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleAskSubmit}
              disabled={askLoading || !askInput.trim()}
              style={{
                padding: "var(--space-2) var(--space-3)",
                border: "none",
                borderRadius: "var(--radius-md)",
                background: "var(--color-interactive-primary)",
                color: "var(--color-text-inverse)",
                fontSize: "var(--font-size-body)",
                fontWeight: "var(--font-weight-medium)",
                cursor: askLoading || !askInput.trim() ? "not-allowed" : "pointer",
                opacity: askLoading || !askInput.trim() ? 0.6 : 1,
              }}
            >
              {askLoading ? "..." : "Send"}
            </button>
          </div>

          {askResult && (
            <p style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-primary)", margin: 0, whiteSpace: "pre-wrap", lineHeight: "var(--line-height-normal)" }}>
              {askResult}
            </p>
          )}

          {askError && (
            <p style={{ fontSize: "var(--font-size-caption)", color: "var(--color-status-danger)", margin: 0 }}>
              {askError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
