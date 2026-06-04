/**
 * Roadmap page types and helper utilities.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Story {
  key: string;
  summary: string;
  status: string;
  sprint?: string;
}

export interface Feature {
  key: string;
  summary: string;
  status: string;
  progress: number;
  planned_start?: string;
  planned_end?: string;
  assignee?: string;
  stories: Story[];
  sprints?: string[];
}

export interface RoadmapData {
  features: Feature[];
  pis: { name: string; start: string; end: string }[];
  sprints: { name: string; start: string; end: string; pi: string }[];
}

export type SortKey = "default" | "progress_asc" | "progress_desc" | "due_asc" | "due_desc" | "at_risk";
export type ViewMode = "feature" | "assignee" | "sprint";
export type GranularityMode = "pi" | "sprint";

// ─── Constants ────────────────────────────────────────────────────────────────

export const PX_PER_DAY = 10;
export const LABEL_WIDTH = 300;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD as local noon to avoid UTC-midnight timezone shift */
export function parseDate(s?: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function fmt(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Convert a date to pixel offset from timeline origin */
export function dateToPx(date: Date, origin: Date): number {
  return Math.round((date.getTime() - origin.getTime()) / 86400000 * PX_PER_DAY);
}

export function isAtRisk(f: Feature): boolean {
  const end = parseDate(f.planned_end);
  if (!end) return false;
  const now = new Date();
  const daysLeft = (end.getTime() - now.getTime()) / 86400000;
  if (end < now && f.progress < 100) return true;
  if (daysLeft <= 21 && f.progress < 80) return true;
  return false;
}

export function isOverdue(f: Feature): boolean {
  const end = parseDate(f.planned_end);
  return !!end && end < new Date() && f.progress < 100;
}

export function daysRemaining(f: Feature): number {
  const end = parseDate(f.planned_end);
  if (!end) return 0;
  return Math.ceil((end.getTime() - new Date().getTime()) / 86400000);
}

export function healthColor(f: Feature): string {
  if (isOverdue(f)) return "var(--red)";
  if (isAtRisk(f)) return "var(--amber)";
  if (f.progress === 100) return "var(--green)";
  return "var(--blue)";
}

const COMMON_PREFIX = /^P-\d+:\s*Cigna Commercial Migration \(ISAAC to IO\)\s*[-–]\s*/i;
export function cleanSummary(summary: string): string {
  return summary.replace(COMMON_PREFIX, "").trim();
}

export function sortFeatures(features: Feature[], sort: SortKey): Feature[] {
  const arr = [...features];
  switch (sort) {
    case "progress_asc": return arr.sort((a, b) => a.progress - b.progress);
    case "progress_desc": return arr.sort((a, b) => b.progress - a.progress);
    case "due_asc": return arr.sort((a, b) => {
      const da = parseDate(a.planned_end)?.getTime() ?? Infinity;
      const db = parseDate(b.planned_end)?.getTime() ?? Infinity;
      return da - db;
    });
    case "due_desc": return arr.sort((a, b) => {
      const da = parseDate(a.planned_end)?.getTime() ?? 0;
      const db = parseDate(b.planned_end)?.getTime() ?? 0;
      return db - da;
    });
    case "at_risk": return arr.sort((a, b) => {
      const ra = isOverdue(a) ? 2 : isAtRisk(a) ? 1 : 0;
      const rb = isOverdue(b) ? 2 : isAtRisk(b) ? 1 : 0;
      return rb - ra;
    });
    default: return arr;
  }
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export function mockData(): RoadmapData {
  const today = new Date();
  const d = (offset: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };
  return {
    pis: [
      { name: "PI 26.2", start: d(-90), end: d(-1) },
      { name: "PI 26.3", start: d(0), end: d(89) },
    ],
    sprints: [],
    features: [
      { key: "EVLGCN-101", summary: "ISAAC Policy Migration", status: "In Progress", progress: 85, planned_start: d(-60), planned_end: d(10), assignee: "Sarah M.", stories: [] },
      { key: "EVLGCN-102", summary: "Image One API Integration", status: "In Progress", progress: 62, planned_start: d(-45), planned_end: d(20), assignee: "James T.", stories: [] },
    ],
  };
}
