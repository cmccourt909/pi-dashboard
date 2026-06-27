"use client";

import { usePathname } from "next/navigation";
import {
  IconHome,
  IconLayoutGrid,
  IconCalendar,
  IconChartBar,
  IconAlertTriangle,
  IconUsers,
  IconSettings,
} from "@tabler/icons-react";
import UserProfileBlock from "./UserProfileBlock";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: IconHome },
  { href: "/features", label: "Features", icon: IconLayoutGrid },
  { href: "/roadmap", label: "Roadmap", icon: IconCalendar },
  { href: "/forecast", label: "Forecast", icon: IconChartBar },
  { href: "/findings", label: "Findings", icon: IconAlertTriangle },
  { href: "/stakeholders", label: "Stakeholder Analysis", icon: IconUsers },
  { href: "/admin", label: "Admin", icon: IconSettings },
];

const SIDEBAR_WIDTH = 176;
const ITEM_INSET = 8;

/**
 * AppSidebar is the persistent left navigation for the Northline rebrand.
 *
 * Spec: Section 7.1
 * - 176px expanded width
 * - Deep Indigo background
 * - Active state: Indigo rounded pill inset 8px
 * - Inactive state: 65% white text
 * - Hover state: rgba(255,255,255,0.08) rounded rectangle
 */
export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      data-testid="app-sidebar"
      className="app-sidebar"
      aria-label="Main navigation"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: SIDEBAR_WIDTH,
        height: "100vh",
        background: "var(--color-nav-bg)",
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
      }}
    >
      {/* Logo lockup — compact variant */}
      <div
        data-testid="sidebar-logo"
        style={{
          padding: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2L13.5 10.5L22 12L13.5 13.5L12 22L10.5 13.5L2 12L10.5 10.5L12 2Z"
            fill="var(--color-text-inverse)"
          />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-family-base)",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "var(--color-text-inverse)",
            textTransform: "uppercase",
          }}
        >
          Northline
        </span>
      </div>

      {/* Navigation items */}
      <nav style={{ flex: 1, padding: "0 var(--space-2)" }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <a
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              data-testid={`nav-item-${label.toLowerCase()}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                margin: "var(--space-1) 0",
                padding: "10px var(--space-3)",
                minHeight: 44,
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                color: active
                  ? "var(--color-nav-active-text)"
                  : "var(--color-nav-text-muted)",
                background: active
                  ? "var(--color-nav-active-bg)"
                  : "transparent",
                transition: "background 0.15s, color 0.15s",
                marginLeft: ITEM_INSET,
                marginRight: ITEM_INSET,
                width: SIDEBAR_WIDTH - ITEM_INSET * 2 - 16, // account for parent padding
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background =
                    "rgba(255, 255, 255, 0.08)";
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    "var(--color-nav-active-text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    "var(--color-nav-text-muted)";
                }
              }}
            >
              <Icon size={18} stroke={1.5} aria-hidden="true" />
              <span
                style={{
                  fontSize: "var(--font-size-body)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                {label}
              </span>
            </a>
          );
        })}
      </nav>

      {/* Divider */}
      <div
        style={{
          height: 1,
          margin: "0 var(--space-4)",
          background: "rgba(255, 255, 255, 0.12)",
        }}
        aria-hidden="true"
      />

      {/* User profile block */}
      <UserProfileBlock name="Alex Morgan" role="Program Lead" />
    </aside>
  );
}
