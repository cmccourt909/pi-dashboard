"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * CommandCenterTopNav — full-width fixed horizontal navigation bar for Command Center V2.
 *
 * Replaces the AppSidebar + TopNavBar combination on the overview page.
 * Uses deep-indigo (#202670) background, 56px height, and displays:
 * - Left: Northline compass mark + brand text
 * - Center: Horizontal nav links with active state highlighting (hidden on mobile)
 * - Right: User profile block (initials avatar + name)
 * - Mobile (<768px): Hamburger menu button toggles a dropdown nav panel
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 9.3
 */

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/features", label: "Features" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/forecast", label: "Forecast" },
  { href: "/findings", label: "Findings" },
  { href: "/admin", label: "Admin" },
] as const;

export interface CommandCenterTopNavProps {
  currentPath: string;
  userName: string;
  userInitials: string;
}

/** Compass mark SVG for the Northline brand lockup. */
function CompassMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="11" stroke="white" strokeWidth="1.5" />
      <path
        d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 8L14.5 14.5L12 13L9.5 14.5L12 8Z"
        fill="white"
      />
    </svg>
  );
}

/** Hamburger menu icon for mobile nav toggle. */
function HamburgerIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Close icon for mobile nav toggle. */
function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M6 18L18 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CommandCenterTopNav({
  currentPath,
  userName,
  userInitials,
}: CommandCenterTopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header
        data-testid="command-center-top-nav"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 h-[56px]"
        style={{ backgroundColor: "var(--color-nav-bg)" }}
      >
        {/* Left: Brand lockup */}
        <div className="flex items-center gap-3">
          <CompassMark />
          <span
            className="hidden sm:inline text-xs font-medium tracking-widest uppercase whitespace-nowrap"
            style={{ color: "var(--color-nav-text)" }}
          >
            NORTHLINE DELIVERY INTELLIGENCE
          </span>
        </div>

        {/* Center: Navigation links — hidden below 768px */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = currentPath === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? "text-white bg-white/15"
                    : "text-white/55 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: User profile + mobile hamburger */}
        <div className="flex items-center gap-2">
          {/* User profile block — hide name on small mobile */}
          <div className="flex items-center gap-2" data-testid="user-profile-block">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium shrink-0"
              style={{
                backgroundColor: "var(--color-brand-indigo)",
                color: "var(--color-text-inverse)",
              }}
              aria-hidden="true"
              data-testid="user-avatar"
            >
              {userInitials}
            </div>
            <span
              className="hidden sm:inline text-[13px] font-medium whitespace-nowrap"
              style={{ color: "var(--color-nav-text)" }}
              data-testid="user-name"
            >
              {userName}
            </span>
          </div>

          {/* Mobile hamburger button — visible only below 768px */}
          <button
            type="button"
            className="inline-flex md:hidden items-center justify-center w-9 h-9 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </header>

      {/* Mobile dropdown nav panel — visible only below 768px when open */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav-menu"
          className="fixed top-[56px] left-0 right-0 z-40 md:hidden"
          style={{
            backgroundColor: "var(--color-nav-bg)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "var(--shadow-drawer)",
          }}
          aria-label="Mobile navigation"
          data-testid="mobile-nav-menu"
        >
          <ul className="flex flex-col py-2 px-4">
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive = currentPath === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "text-white bg-white/15"
                        : "text-white/65 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
