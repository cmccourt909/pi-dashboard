"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/features", label: "Features" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/forecast", label: "Forecast" },
  { href: "/findings", label: "Findings" },
  { href: "/admin", label: "Admin" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: 20 }} aria-label="Main navigation">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: active ? "white" : "rgba(255, 255, 255, 0.55)",
              transition: "color 0.15s",
              padding: "4px 0",
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255, 255, 255, 0.8)";
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255, 255, 255, 0.55)";
            }}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
