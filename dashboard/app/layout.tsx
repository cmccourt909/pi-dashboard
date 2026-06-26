import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppSidebar from "@/components/navigation/AppSidebar";
import TopNavBar from "@/components/navigation/TopNavBar";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import AutoRefresh from "@/components/AutoRefresh";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-family-base",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Northline — Delivery Intelligence",
  description: "AI-powered delivery intelligence that helps leaders see clearly, act confidently, and deliver on time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.variable}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AppSidebar />
        <TopNavBar />
        <MobileBottomNav />
        <main
          id="main-content"
          className="main-content"
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </body>
    </html>
  );
}
