"use client";

import { IconBell } from "@tabler/icons-react";

/**
 * NotificationBell displays a bell icon with a numeric badge.
 *
 * Spec: Section 8.3
 * - Badge colour: Coral (#E85D46)
 * - Max display: 99+
 *
 * Note: This is a placeholder until the notification model and read/unread
 * state are defined in Wave 0.
 */
export interface NotificationBellProps {
  count?: number;
  onClick?: () => void;
}

export default function NotificationBell({ count = 0, onClick }: NotificationBellProps) {
  const displayCount = count > 99 ? "99+" : count;

  return (
    <button
      type="button"
      data-testid="notification-bell"
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        border: "none",
        background: "transparent",
        color: "var(--color-text-secondary)",
        cursor: "pointer",
        borderRadius: "var(--radius-md)",
        position: "relative",
      }}
    >
      <IconBell size={20} stroke={1.5} />
      {count > 0 && (
        <span
          data-testid="notification-badge"
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: "50%",
            background: "var(--color-status-danger)",
            color: "var(--color-text-inverse)",
            fontSize: 10,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {displayCount}
        </span>
      )}
    </button>
  );
}
