"use client";

import { useCallback, useState } from "react";
import TranscriptDock from "../../components/stakeholders/TranscriptDock";
import LodestarStrip from "../../components/stakeholders/LodestarStrip";
import KPISummary from "../../components/stakeholders/KPISummary";
import SectionRail from "../../components/stakeholders/SectionRail";
import SessionHistory from "../../components/stakeholders/SessionHistory";
import { useAnalysisStream, type SectionKey } from "../../components/stakeholders/useAnalysisStream";

// Section views
import SpeakerStatsView from "../../components/stakeholders/views/SpeakerStatsView";
import MeetingMinutesView from "../../components/stakeholders/views/MeetingMinutesView";
import RaidLogView from "../../components/stakeholders/views/RaidLogView";
import DeliverySignalsView from "../../components/stakeholders/views/DeliverySignalsView";
import TeamHealthView from "../../components/stakeholders/views/TeamHealthView";
import GapAnalysisView from "../../components/stakeholders/views/GapAnalysisView";
import EmpathyMapView from "../../components/stakeholders/views/EmpathyMapView";
import StakeRegisterView from "../../components/stakeholders/views/StakeRegisterView";

export default function StakeholderAnalysisPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("speaker_statistics");
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
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      startStream(sessionId);
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
            loadPersistedSession(data);
          } else {
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
    (section: SectionKey) => {
      const text = sections[section]?.text;
      if (text) navigator.clipboard?.writeText(text);
    },
    [sections]
  );

  // Build status map for rail
  const statuses = Object.fromEntries(
    Object.entries(sections).map(([k, v]) => [k, v.status])
  ) as Record<SectionKey, typeof sections[SectionKey]["status"]>;

  // Active section view
  const activeSectionState = sections[activeSection];
  const sectionText = activeSectionState?.text || "";
  const sectionHasContent = activeSectionState?.status === "complete" || (activeSectionState?.status === "streaming" && sectionText.length > 0);

  const renderActiveView = () => {
    if (!sectionHasContent) {
      return (
        <div
          style={{
            flex: 1,
            background: "var(--color-surface-card)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-card)",
            padding: "var(--space-8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-tertiary)",
            fontSize: "var(--font-size-body)",
            fontStyle: "italic",
          }}
        >
          {activeSectionState?.status === "streaming" ? "Analyzing…" : "Upload a transcript to begin analysis."}
        </div>
      );
    }

    const props = {
      text: sectionText,
      onCopy: () => handleCopy(activeSection),
      onRegenerate: () => handleRegenerate(activeSection),
    };

    switch (activeSection) {
      case "speaker_statistics": return <SpeakerStatsView {...props} />;
      case "meeting_minutes": return <MeetingMinutesView {...props} />;
      case "raid_log": return <RaidLogView {...props} />;
      case "delivery_signals": return <DeliverySignalsView {...props} />;
      case "team_health": return <TeamHealthView {...props} />;
      case "gap_analysis": return <GapAnalysisView {...props} />;
      case "empathy_map": return <EmpathyMapView {...props} />;
      case "stakeholder_register": return <StakeRegisterView {...props} />;
      default: return null;
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gap: "var(--space-6)",
        minHeight: "calc(100vh - 56px - var(--space-8) - var(--space-8))",
        maxWidth: 1600,
      }}
    >
      {/* Sidebar: Session History */}
      <SessionHistory
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        refreshTrigger={refreshTrigger}
      />

      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {/* Page header */}
        <div>
          <h1 style={{ fontSize: "var(--font-size-h1)", fontWeight: 700, margin: 0 }}>Stakeholder Analysis</h1>
          <p style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Transcript intelligence across eight dimensions.
          </p>
        </div>

        {/* Transcript upload dock */}
        <TranscriptDock onUploadComplete={handleUploadComplete} />

        {/* Lodestar Insights */}
        <LodestarStrip sections={sections} />

        {/* KPI Summary */}
        <KPISummary sections={sections} />

        {/* Section Rail + Active View */}
        <div style={{ display: "flex", gap: "var(--space-5)" }}>
          <SectionRail active={activeSection} onSelect={setActiveSection} statuses={statuses} />
          {renderActiveView()}
        </div>

        {/* Footer */}
        <footer style={{ textAlign: "center", fontSize: 11, paddingTop: "var(--space-4)", color: "var(--color-text-secondary)" }}>
          Northline Delivery Intelligence · Powered by Lodestar AI
        </footer>
      </div>
    </div>
  );
}
