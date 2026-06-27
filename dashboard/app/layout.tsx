import type { Metadata } from "next";
import { Inter } from "next/font/google";
import LayoutSelector from "@/components/navigation/LayoutSelector";
import MainContentWrapper from "@/components/navigation/MainContentWrapper";
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
        <LayoutSelector />
        <MainContentWrapper>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </MainContentWrapper>
      </body>
    </html>
  );
}
