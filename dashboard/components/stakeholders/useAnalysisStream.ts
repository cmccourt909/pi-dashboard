"use client";

import { useCallback, useRef, useState } from "react";

export type SectionStatus = "pending" | "streaming" | "complete" | "error";

export interface SectionState {
  status: SectionStatus;
  text: string;
  error?: string;
}

const ANALYSIS_SECTION_KEYS = [
  "speaker_statistics",
  "meeting_minutes",
  "raid_log",
  "delivery_signals",
  "team_health",
  "gap_analysis",
  "empathy_map",
  "stakeholder_register",
] as const;

export type SectionKey = (typeof ANALYSIS_SECTION_KEYS)[number];

export function initSections(): Record<SectionKey, SectionState> {
  const sections: Record<string, SectionState> = {};
  for (const key of ANALYSIS_SECTION_KEYS) {
    sections[key] = { status: "pending", text: "" };
  }
  return sections as Record<SectionKey, SectionState>;
}

interface UseAnalysisStreamReturn {
  sections: Record<SectionKey, SectionState>;
  isStreaming: boolean;
  allDone: boolean;
  startStream: (sessionId: string) => void;
  regenerateSection: (sessionId: string, section: SectionKey) => void;
  loadPersistedSession: (sessionData: PersistedSessionData) => void;
  reset: () => void;
}

export interface PersistedSectionData {
  section_key: string;
  status: string;
  result_text: string | null;
  error_message: string | null;
}

export interface PersistedSessionData {
  sections: PersistedSectionData[];
}

/**
 * useAnalysisStream — custom hook that manages SSE streaming for
 * stakeholder analysis. Opens EventSource connections, parses events,
 * and routes chunks to the correct section state.
 */
export function useAnalysisStream(): UseAnalysisStreamReturn {
  const [sections, setSections] = useState<Record<SectionKey, SectionState>>(initSections);
  const [isStreaming, setIsStreaming] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const handleEvent = useCallback((rawData: string) => {
    try {
      const event = JSON.parse(rawData);

      switch (event.type) {
        case "section_start":
          setSections((prev) => ({
            ...prev,
            [event.section]: { status: "streaming", text: "", error: undefined },
          }));
          break;

        case "chunk":
          setSections((prev) => ({
            ...prev,
            [event.section]: {
              ...prev[event.section as SectionKey],
              text: prev[event.section as SectionKey].text + event.text,
            },
          }));
          break;

        case "section_done":
          setSections((prev) => ({
            ...prev,
            [event.section]: {
              ...prev[event.section as SectionKey],
              status: "complete",
            },
          }));
          break;

        case "section_error":
          setSections((prev) => ({
            ...prev,
            [event.section]: {
              ...prev[event.section as SectionKey],
              status: "error",
              error: event.error,
            },
          }));
          break;

        case "all_done":
          setIsStreaming(false);
          setAllDone(true);
          closeConnection();
          break;
      }
    } catch {
      // Ignore malformed events
    }
  }, [closeConnection]);

  const startStream = useCallback(
    (sessionId: string) => {
      closeConnection();
      setSections(initSections());
      setIsStreaming(true);
      setAllDone(false);

      const es = new EventSource(`/api/stakeholders/sessions/${sessionId}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        handleEvent(e.data);
      };

      es.onerror = () => {
        setIsStreaming(false);
        closeConnection();
      };
    },
    [closeConnection, handleEvent]
  );

  const regenerateSection = useCallback(
    (sessionId: string, section: SectionKey) => {
      // Reset just that section
      setSections((prev) => ({
        ...prev,
        [section]: { status: "pending", text: "", error: undefined },
      }));

      // Use fetch with POST and read the SSE stream manually
      const abortController = new AbortController();

      fetch(`/api/stakeholders/sessions/${sessionId}/sections/${section}/regenerate`, {
        method: "POST",
        signal: abortController.signal,
      })
        .then(async (res) => {
          if (!res.ok || !res.body) {
            setSections((prev) => ({
              ...prev,
              [section]: { status: "error", text: "", error: `Regeneration failed (${res.status})` },
            }));
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                handleEvent(line.slice(6));
              }
            }
          }

          // Process remaining buffer
          if (buffer.startsWith("data: ")) {
            handleEvent(buffer.slice(6));
          }
        })
        .catch(() => {
          setSections((prev) => ({
            ...prev,
            [section]: { status: "error", text: "", error: "Network error during regeneration" },
          }));
        });
    },
    [handleEvent]
  );

  const loadPersistedSession = useCallback((sessionData: PersistedSessionData) => {
    const loaded = initSections();
    for (const sec of sessionData.sections) {
      const key = sec.section_key as SectionKey;
      if (key in loaded) {
        loaded[key] = {
          status: sec.status === "complete" ? "complete" : sec.status === "error" ? "error" : "pending",
          text: sec.result_text || "",
          error: sec.error_message || undefined,
        };
      }
    }
    setSections(loaded);
    setIsStreaming(false);
    setAllDone(true);
    closeConnection();
  }, [closeConnection]);

  const reset = useCallback(() => {
    closeConnection();
    setSections(initSections());
    setIsStreaming(false);
    setAllDone(false);
  }, [closeConnection]);

  return {
    sections,
    isStreaming,
    allDone,
    startStream,
    regenerateSection,
    loadPersistedSession,
    reset,
  };
}
