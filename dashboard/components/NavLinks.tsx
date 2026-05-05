"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "PI Overview" },
  { href: "/features", label: "Features" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/forecast", label: "Forecast" },
  { href: "/admin", label: "Admin", muted: true },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: 24 }}>
      {LINKS.map(({ href, label, muted }) => {
        const active = pathname === href;
        return (
          <a
            key={href}
            href={href}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: active
                ? "var(--accent)"
                : muted
                ? "var(--text-muted)"
                : "var(--text-secondary)",
              textTransform: "uppercase",
              padding: "4px 0",
              borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "var(--accent)";
              el.style.borderBottomColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = active
                ? "var(--accent)"
                : muted
                ? "var(--text-muted)"
                : "var(--text-secondary)";
              el.style.borderBottomColor = active ? "var(--accent)" : "transparent";
            }}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
