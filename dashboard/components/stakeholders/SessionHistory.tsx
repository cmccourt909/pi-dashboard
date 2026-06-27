"use client";

import { useCallback, useEffect, useState } from "react";

export interface SessionSummary {
  id: string;
  filename: string;
  created_at: string;
  status: string;
}

interface SessionHistoryProps {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  refreshTrigger?: number;
}

/**
 * SessionHistory — sidebar component that displays past analysis sessions
 * and allows loading their persisted results.
 */
export default function SessionHistory({
  activeSessionId,
  onSelectSession,
  refreshTrigger,
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stakeholders/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch {
      // Silently fail — sessions list is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshTrigger]);

  return (
    <aside
      style={{
        background: "var(--color-surface-card)",
        border: "0.5px solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-5)",
        height: "fit-content",
        maxHeight: "calc(100vh - 56px - var(--space-8) - var(--space-8))",
        overflowY: "auto",
        position: "sticky",
        top: "calc(56px + var(--space-8))",
      }}
    >
      <p
        style={{
          fontSize: "var(--font-size-label)",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-4)",
        }}
      >
        Sessions
      </p>

      {loading && sessions.length === 0 ? (
        <p style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-tertiary)" }}>
          Loading…
        </p>
      ) : sessions.length === 0 ? (
        <p style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-tertiary)" }}>
          No sessions yet. Upload a transcript to begin.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {sessions.map((session) => (
            <li
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectSession(session.id);
                }
              }}
              aria-current={session.id === activeSessionId ? "true" : undefined}
              style={{
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                background: session.id === activeSessionId ? "var(--color-fill-info)" : "transparent",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-body)",
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  margin: 0,
                }}
              >
                {session.filename}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: 2 }}>
                <p style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-tertiary)", margin: 0 }}>
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background:
                      session.status === "complete"
                        ? "var(--color-status-success)"
                        : session.status === "running"
                          ? "var(--color-status-info)"
                          : session.status === "failed"
                            ? "var(--color-status-danger)"
                            : "var(--color-text-tertiary)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
