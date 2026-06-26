"use client";

import { usePathname } from "next/navigation";
import {
  IconHome,
  IconLayoutGrid,
  IconCalendar,
  IconChartBar,
  IconAlertTriangle,
} from "@tabler/icons-react";

const MOBILE_NAV_ITEMS = [
  { href: "/", label: "Overview", icon: IconHome },
  { href: "/features", label: "Features", icon: IconLayoutGrid },
  { href: "/roadmap", label: "Roadmap", icon: IconCalendar },
  { href: "/forecast", label: "Forecast", icon: IconChartBar },
  { href: "/findings", label: "Findings", icon: IconAlertTriangle },
];

const BOTTOM_NAV_HEIGHT = 60;

/**
 * MobileBottomNav is the fixed bottom navigation bar for mobile breakpoints.
 *
 * Spec: Section 7.3
 * - 60px tall, fixed bottom
 * - 5 tabs: Overview, Features, Roadmap, Forecast, Findings
 * - Active tab: Indigo icon; inactive: Slate
 *
 * Note: this component is rendered on all viewports but only visible at
 * ≤767px via CSS media query.
 */
export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Mobile navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: BOTTOM_NAV_HEIGHT,
        background: "var(--color-surface-card)",
        borderTop: "1px solid var(--color-border-default)",
        display: "none",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 50,
      }}
    >
      {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            data-testid={`mobile-nav-${label.toLowerCase()}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              width: 56,
              height: 56,
              textDecoration: "none",
              color: active
                ? "var(--color-brand-indigo)"
                : "var(--color-brand-slate)",
              transition: "color 0.15s",
            }}
          >
            <Icon size={22} stroke={1.5} />
            <span
              style={{
                fontSize: 10,
                fontWeight: active ? 500 : 400,
              }}
            >
              {label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
