"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "PI Overview" },
  { href: "/features", label: "Features" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: 24 }}>
      {LINKS.map(({ href, label }) => {
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
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              textTransform: "uppercase",
              padding: "4px 0",
              borderBottom: "1px solid " + (active ? "var(--accent)" : "transparent"),
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "var(--text-primary)";
              el.style.borderBottomColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = active ? "var(--text-primary)" : "var(--text-secondary)";
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