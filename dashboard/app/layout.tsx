import type { Metadata } from "next";
import NavLinks from "@/components/NavLinks";
import AutoRefresh from "@/components/AutoRefresh";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waypoint — Delivery Intelligence",
  description: "Know where every program stands. Before someone has to ask.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--color-indigo-900)",
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 var(--space-6)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Waypoint logo mark — stylised pin */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="10" r="7" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="12" cy="10" r="3" fill="#E8622A" />
              <line x1="12" y1="17" x2="12" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{
                fontWeight: 500,
                fontSize: 15,
                letterSpacing: "-0.02em",
                color: "white",
              }}>
                Waypoint
              </span>
              <span style={{
                fontSize: 13,
                color: "var(--color-indigo-400)",
                fontWeight: 400,
              }}>
                Delivery intelligence
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <NavLinks />
            <AutoRefresh intervalSeconds={60} />
          </div>
        </header>
        <main
          id="main-content"
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "var(--space-8) var(--space-6) 64px",
          }}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </body>
    </html>
  );
}
