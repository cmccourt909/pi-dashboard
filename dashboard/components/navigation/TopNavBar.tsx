"use client";

import { usePathname } from "next/navigation";
import { IconRefresh } from "@tabler/icons-react";
import LiveDataIndicator from "./LiveDataIndicator";
import NotificationBell from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/features": "Features",
  "/roadmap": "Roadmap",
  "/forecast": "Forecast",
  "/findings": "Findings",
  "/admin": "Admin",
};

function getPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] || "Northline";
}

/**
 * TopNavBar is the 56px utility bar above the main content area.
 *
 * Spec: Section 7.2
 * - Height: 56px
 * - Background: white
 * - Contents: page title, live data indicator, refresh, search, notifications, avatar
 */
export interface TopNavBarProps {
  liveTimestamp?: string;
  isLive?: boolean;
  notificationCount?: number;
  onRefresh?: () => void;
  onSearch?: () => void;
  userInitials?: string;
}

export default function TopNavBar({
  liveTimestamp,
  isLive = true,
  notificationCount = 0,
  onRefresh,
  onSearch,
  userInitials = "AM",
}: TopNavBarProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header
      data-testid="top-nav-bar"
      style={{
        position: "fixed",
        top: 0,
        left: 176, // AppSidebar width
        right: 0,
        height: 56,
        background: "var(--color-surface-card)",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-5)",
        zIndex: 30,
      }}
    >
      {/* Left: page title */}
      <h2
        style={{
          fontSize: "var(--font-size-h2)",
          fontWeight: "var(--font-weight-semi)",
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        {pageTitle}
      </h2>

      {/* Right: utilities */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
        }}
      >
        <LiveDataIndicator timestamp={liveTimestamp} isLive={isLive} />

        <button
          type="button"
          data-testid="refresh-button"
          onClick={onRefresh}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            minHeight: 44,
            padding: "var(--space-2) var(--space-3)",
            border: "none",
            background: "transparent",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-body)",
            fontWeight: 500,
            cursor: "pointer",
            borderRadius: "var(--radius-md)",
          }}
        >
          <IconRefresh size={18} stroke={1.5} />
          <span>Refresh</span>
        </button>

        <GlobalSearch onSearch={onSearch} />

        <NotificationBell count={notificationCount} />

        <div
          data-testid="user-avatar"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--color-brand-indigo)",
            color: "var(--color-text-inverse)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {userInitials}
        </div>
      </div>
    </header>
  );
}
