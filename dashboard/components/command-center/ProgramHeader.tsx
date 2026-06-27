import React from "react";

export interface ProgramHeaderProps {
  lastSyncTimestamp: string | null;
  isSyncing: boolean;
}

/**
 * Formats an ISO timestamp into a human-readable date/time string.
 * Returns null if the input is null or invalid.
 */
function formatSyncTimestamp(timestamp: string | null): string | null {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

/**
 * ProgramHeader displays the "Program overview" heading along with
 * the last data sync timestamp and a visual loading indicator when syncing.
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */
export default function ProgramHeader({
  lastSyncTimestamp,
  isSyncing,
}: ProgramHeaderProps) {
  const formattedTime = formatSyncTimestamp(lastSyncTimestamp);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-4) 0",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 600,
          color: "var(--color-text-primary)",
        }}
      >
        Program overview
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        {isSyncing && <SyncSpinner />}
        <span
          style={{
            fontSize: 13,
            color: "var(--color-text-secondary)",
          }}
          data-testid="sync-status"
        >
          {isSyncing
            ? "Syncing…"
            : formattedTime
              ? `Last synced ${formattedTime}`
              : "Not yet synced"}
        </span>
      </div>
    </header>
  );
}

/** Animated spinner indicating an active sync operation. */
function SyncSpinner() {
  return (
    <>
      <span
        role="status"
        aria-label="Syncing data"
        data-testid="sync-spinner"
        style={{
          display: "inline-block",
          width: 14,
          height: 14,
          border: "2px solid var(--color-fill-info)",
          borderTopColor: "var(--color-status-info, var(--color-brand-indigo))",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
