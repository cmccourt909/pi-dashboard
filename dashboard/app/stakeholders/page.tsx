"use client";

import { useCallback, useState } from "react";
import TranscriptUploader from "../../components/stakeholders/TranscriptUploader";
import SectionPanel from "../../components/stakeholders/SectionPanel";
import SessionHistory from "../../components/stakeholders/SessionHistory";
import ExportBar from "../../components/stakeholders/ExportBar";
import { useAnalysisStream, type SectionKey } from "../../components/stakeholders/useAnalysisStream";

/**
 * Section keys matching the backend orchestrator's SECTIONS list.
 */
const ANALYSIS_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "speaker_statistics", label: "Speaker Statistics" },
  { key: "meeting_minutes", label: "Meeting Minutes" },
  { key: "raid_log", label: "RAID Log" },
  { key: "delivery_signals", label: "Delivery Signals" },
  { key: "team_health", label: "Team Health" },
  { key: "gap_analysis", label: "Gap Analysis" },
  { key: "empathy_map", label: "Empathy Map" },
  { key: "stakeholder_register", label: "Stakeholder Register" },
];

export default function StakeholderAnalysisPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    sections,
    isStreaming,
    allDone,
    startStream,
    regenerateSection,
    loadPersistedSession,
    reset,
  } = useAnalysisStream();

  const handleUploadComplete = useCallback(
    (sessionId: string, _filename: string) => {
      setActiveSessionId(sessionId);
      startStream(sessionId);
      // Refresh session list after a short delay for the session to be created
      setTimeout(() => setRefreshTrigger((n) => n + 1), 500);
    },
    [startStream]
  );

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (sessionId === activeSessionId && (isStreaming || allDone)) return;

      setActiveSessionId(sessionId);
      try {
        const res = await fetch(`/api/stakeholders/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "complete" || data.status === "failed") {
            // Load persisted results
            loadPersistedSession(data);
          } else {
            // Session still running — connect to stream
            startStream(sessionId);
          }
        }
      } catch {
        reset();
      }
    },
    [activeSessionId, isStreaming, allDone, loadPersistedSession, startStream, reset]
  );

  const handleRegenerate = useCallback(
    (section: SectionKey) => {
      if (!activeSessionId) return;
      regenerateSection(activeSessionId, section);
    },
    [activeSessionId, regenerateSection]
  );

  const handleCopy = useCallback(
    async (section: SectionKey) => {
      const text = sections[section]?.text;
      if (text) {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Clipboard API may not be available
        }
      }
    },
    [sections]
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: "var(--space-6)",
        minHeight: "calc(100vh - 56px - var(--space-8) - var(--space-8))",
        maxWidth: 1600,
      }}
    >
      {/* ── Sidebar: Session History ──────────────────────────────── */}
      <SessionHistory
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        refreshTrigger={refreshTrigger}
      />

      {/* ── Main Content Area ─────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {/* Header */}
        <div>
          <p
            style={{
              fontSize: "var(--font-size-label)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-1)",
            }}
          >
            Stakeholder Analysis
          </p>
          <h1>Transcript Intelligence</h1>
          <p style={{ marginTop: "var(--space-2)" }}>
            Upload a meeting transcript to generate comprehensive stakeholder analysis across eight dimensions.
          </p>
        </div>

        {/* Transcript Uploader */}
        <section
          aria-label="Upload transcript"
          style={{
            background: "var(--color-surface-card)",
            border: "0.5px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-6)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-label)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-3)",
            }}
          >
            Upload Transcript
          </p>
          <TranscriptUploader onUploadComplete={handleUploadComplete} />
        </section>

        {/* Analysis Progress */}
        <section
          aria-label="Analysis progress"
          style={{
            background: "var(--color-surface-card)",
            border: "0.5px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4) var(--space-5)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-label)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-3)",
            }}
          >
            Progress
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {ANALYSIS_SECTIONS.map((s) => {
              const state = sections[s.key];
              return (
                <span
                  key={s.key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 10px",
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
                  {s.label}
                </span>
              );
            })}
          </div>
        </section>

        {/* Section Panels (×8) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {ANALYSIS_SECTIONS.map((s) => (
            <SectionPanel
              key={s.key}
              sectionKey={s.key}
              state={sections[s.key]}
              onRegenerate={() => handleRegenerate(s.key)}
              onCopy={() => handleCopy(s.key)}
            />
          ))}
        </div>

        {/* Export Bar */}
        <ExportBar
          sessionId={activeSessionId}
          sections={sections}
          allDone={allDone}
        />
      </div>
    </div>
  );
}
