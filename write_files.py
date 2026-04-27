import os

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Written: ' + path)

w('dashboard/lib/api.ts', """const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface SprintSummary {
  jira_id: number;
  name: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  total_issues: number;
  done_issues: number;
  blocked_issues: number;
  pct_complete: number;
}

export interface PISummary {
  name: string;
  start_date: string;
  end_date: string;
  total_issues: number;
  done_issues: number;
  blocked_issues: number;
  pct_complete: number;
  critical_findings: number;
  health: "green" | "amber" | "red";
  sprints: SprintSummary[];
}

export interface FeatureStorySummary {
  jira_key: string;
  summary: string;
  status: string;
  status_category: string;
  project_key: string;
  sprint_name: string | null;
  assignee: string | null;
  story_points: number | null;
  blocked: boolean;
}

export interface FeatureSummary {
  feature_key: string;
  feature_summary: string;
  total_stories: number;
  done_stories: number;
  blocked_stories: number;
  pct_complete: number;
  health: "green" | "amber" | "red";
  stories: FeatureStorySummary[];
}

export interface Finding {
  rule_id: string;
  severity: string;
  category: string;
  title: string;
  detail: string;
  recommendation: string;
  issue_keys: string[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path, { cache: "no-store" });
  if (!res.ok) throw new Error("API error " + res.status + " on " + path);
  return res.json();
}

export const api = {
  pis: () => get<PISummary[]>("/api/pis"),
  features: () => get<FeatureSummary[]>("/api/features"),
  findings: (params?: { severity?: string; category?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<Finding[]>("/api/findings" + (qs ? "?" + qs : ""));
  },
};
""")

w('dashboard/components/HealthBadge.tsx', """import clsx from "clsx";

interface Props {
  health: "green" | "amber" | "red";
  size?: "sm" | "md";
}

const labels = { green: "ON TRACK", amber: "AT RISK", red: "CRITICAL" };

const styles = {
  green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  red: "bg-red-500/20 text-red-400 border-red-500/40",
};

export function HealthBadge({ health, size = "md" }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-mono font-bold tracking-widest border",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1",
        styles[health]
      )}
    >
      {labels[health]}
    </span>
  );
}
""")

w('dashboard/components/ProgressBar.tsx', """import clsx from "clsx";

interface Props {
  pct: number;
  health: "green" | "amber" | "red";
  showLabel?: boolean;
}

const barColors = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function ProgressBar({ pct, health, showLabel = true }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all", barColors[health])}
          style={{ width: Math.min(pct, 100) + "%" }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-xs text-white/60 w-10 text-right">
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
""")

w('dashboard/app/globals.css', """@import "tailwindcss";

:root {
  --bg-base: #0a0c0f;
  --bg-surface: #111318;
  --bg-elevated: #1a1d24;
  --border: rgba(255,255,255,0.08);
  --text-primary: #e8eaf0;
  --text-secondary: #8b909e;
  --text-muted: #4a4f5e;
  --accent-green: #10b981;
  --accent-amber: #f59e0b;
  --accent-red: #ef4444;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: "DM Sans", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
}

.font-mono { font-family: "DM Mono", "Fira Code", monospace; }
""")

w('dashboard/app/layout.tsx', """import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delivery Health",
  description: "Cross-project delivery health dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="border-b border-white/8 bg-[#0a0c0f]/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white/30 tracking-widest">▸</span>
              <span className="font-semibold tracking-tight text-white/90">DELIVERY HEALTH</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-white/50 hover:text-white/90 transition-colors">
                Program
              </Link>
              <Link href="/features" className="text-white/50 hover:text-white/90 transition-colors">
                Features
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
""")

w('dashboard/app/page.tsx', """import { api } from "@/lib/api";
import { HealthBadge } from "@/components/HealthBadge";
import { ProgressBar } from "@/components/ProgressBar";
import Link from "next/link";

export default async function HomePage() {
  const pis = await api.pis();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-xs text-white/30 tracking-widest mb-1">PROGRAM OVERVIEW</p>
        <h1 className="text-2xl font-semibold text-white/90">Program Increments</h1>
        <p className="text-sm text-white/40 mt-1">Today: {today}</p>
      </div>

      <div className="space-y-3">
        {pis.map((pi) => {
          const isActive = pi.start_date <= today && today <= pi.end_date;
          return (
            <Link key={pi.name} href={"/pi/" + pi.name}>
              <div className="group relative border border-white/8 bg-[#111318] hover:bg-[#1a1d24] hover:border-white/16 transition-all cursor-pointer">
                <div
                  className={"absolute left-0 top-0 bottom-0 w-1 " + (
                    pi.health === "red" ? "bg-red-500" :
                    pi.health === "amber" ? "bg-amber-500" : "bg-emerald-500"
                  )}
                />
                <div className="pl-6 pr-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-medium text-white/90">
                        PI {pi.name}
                      </span>
                      {isActive && (
                        <span className="font-mono text-[10px] tracking-widest text-emerald-400 border border-emerald-500/40 px-2 py-0.5">
                          ACTIVE
                        </span>
                      )}
                      <HealthBadge health={pi.health} size="sm" />
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-white/40">
                        {pi.start_date} to {pi.end_date}
                      </span>
                      <span className="font-mono text-white/60">
                        {pi.sprints.length} sprints
                      </span>
                    </div>
                  </div>
                  <ProgressBar pct={pi.pct_complete} health={pi.health} />
                  <div className="flex items-center gap-6 mt-3 text-xs font-mono text-white/40">
                    <span>{pi.total_issues} stories</span>
                    <span>{pi.done_issues} done</span>
                    {pi.blocked_issues > 0 && (
                      <span className="text-red-400">{pi.blocked_issues} blocked</span>
                    )}
                    {pi.critical_findings > 0 && (
                      <span className="text-red-400">
                        {pi.critical_findings} critical finding{pi.critical_findings !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
""")

print("All files written.")