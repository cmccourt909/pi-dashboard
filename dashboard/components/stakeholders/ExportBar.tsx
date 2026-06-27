"use client";

import { useState } from "react";
import type { SectionKey, SectionState } from "./useAnalysisStream";

interface ExportBarProps {
  sessionId: string | null;
  sections: Record<SectionKey, SectionState>;
  allDone: boolean;
}

/**
 * ExportBar — provides "Export Markdown" download button and
 * "Copy All" clipboard button. Disabled when session is incomplete.
 */
export default function ExportBar({ sessionId, sections, allDone }: ExportBarProps) {
  const [copied, setCopied] = useState(false);

  const canExport = allDone && sessionId;

  const handleExport = async () => {
    if (!sessionId) return;
    // Trigger file download via the export endpoint
    window.open(`/api/stakeholders/sessions/${sessionId}/export?format=markdown`, "_blank");
  };

  const handleCopyAll = async () => {
    const allText = Object.entries(sections)
      .filter(([, state]) => state.status === "complete" && state.text)
      .map(([, state]) => state.text)
      .join("\n\n---\n\n");

    try {
      await navigator.clipboard.writeText(allText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: clipboard API may not be available
    }
  };

  return (
    <section
      aria-label="Export options"
      style={{
        background: "var(--color-surface-card)",
        border: "0.5px solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4) var(--space-5)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
      }}
    >
      <button
        onClick={handleExport}
        disabled={!canExport}
        style={{
          minHeight: 36,
          padding: "var(--space-2) var(--space-4)",
          fontSize: "var(--font-size-body)",
          fontWeight: 500,
          border: "none",
          borderRadius: "var(--radius-md)",
          background: "var(--color-interactive-primary)",
          color: "var(--color-text-inverse)",
          cursor: canExport ? "pointer" : "not-allowed",
          opacity: canExport ? 1 : 0.5,
        }}
      >
        Export Markdown
      </button>
      <button
        onClick={handleCopyAll}
        disabled={!canExport}
        style={{
          minHeight: 36,
          padding: "var(--space-2) var(--space-4)",
          fontSize: "var(--font-size-body)",
          fontWeight: 500,
          border: "0.5px solid var(--color-border-default)",
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-card)",
          color: "var(--color-text-primary)",
          cursor: canExport ? "pointer" : "not-allowed",
          opacity: canExport ? 1 : 0.5,
        }}
      >
        {copied ? "✓ Copied!" : "Copy All to Clipboard"}
      </button>
    </section>
  );
}
