import type { Metadata } from "next";
import NavLinks from "@/components/NavLinks";
import AutoRefresh from "@/components/AutoRefresh";
import "./globals.css";

export const metadata: Metadata = {
  title: "PI Health Dashboard",
  description: "Program Increment risk and velocity tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-panel)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          padding: "0 32px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <rect x="2" y="2" width="9" height="9" stroke="var(--accent)" strokeWidth="1.5" />
              <rect x="13" y="2" width="9" height="9" stroke="var(--status-warning)" strokeWidth="1.5" />
              <rect x="2" y="13" width="9" height="9" stroke="var(--status-critical)" strokeWidth="1.5" />
              <rect x="13" y="13" width="9" height="9" stroke="var(--status-healthy)" strokeWidth="1.5" />
            </svg>
            <span style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "0.05em",
              color: "var(--text-primary)",
            }}>
              PI HEALTH
            </span>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
            }}>
              DASHBOARD
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <AutoRefresh intervalSeconds={60} />
            <NavLinks />
          </div>
        </header>
        <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px 64px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
