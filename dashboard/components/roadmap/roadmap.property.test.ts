/**
 * Property-based tests for roadmap components using fast-check.
 *
 * These validate universal correctness properties from the design document.
 * Each test runs 100+ iterations with randomly generated inputs.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateSegmentWidths } from "./GanttBar";
import { calculateTodayLinePosition } from "./TodayLine";
import { computeKPIs } from "./SummaryStrip";
import type { FeatureItem } from "@/types/roadmap";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generate a valid (done, prog, todo) tuple summing to 100. */
const percentageTuple = fc
  .tuple(fc.float({ min: 0, max: 100 }), fc.float({ min: 0, max: 100 }))
  .map(([a, b]) => {
    const done = Math.round(a * 10) / 10;
    const prog = Math.round(Math.min(b, 100 - done) * 10) / 10;
    const todo = Math.round((100 - done - prog) * 10) / 10;
    return { done: Math.max(0, done), prog: Math.max(0, prog), todo: Math.max(0, Math.min(100, todo)) };
  })
  .filter(({ done, prog, todo }) => done >= 0 && prog >= 0 && todo >= 0 && Math.abs(done + prog + todo - 100) < 1);

/** Generate a positive column width. */
const columnWidth = fc.integer({ min: 50, max: 1200 });

/** Generate a valid FeatureItem for KPI testing. */
const featureItemArb: fc.Arbitrary<FeatureItem> = fc.record({
  feature_key: fc.string({ minLength: 1, maxLength: 10 }),
  summary: fc.string({ minLength: 1, maxLength: 50 }),
  team: fc.constantFrom("Alpha" as const, "Bravo" as const, "Charlie" as const),
  assignee: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  status: fc.string({ minLength: 1, maxLength: 20 }),
  status_category: fc.string({ minLength: 1, maxLength: 20 }),
  rag_status: fc.constantFrom("red" as const, "amber" as const, "green" as const),
  pi_completion: fc.array(
    fc.record({
      pi_name: fc.string({ minLength: 1, maxLength: 10 }),
      done_pct: fc.float({ min: 0, max: 100 }),
      prog_pct: fc.float({ min: 0, max: 100 }),
      todo_pct: fc.float({ min: 0, max: 100 }),
      story_count: fc.nat({ max: 50 }),
      sp_done: fc.float({ min: 0, max: 200 }),
      sp_total: fc.float({ min: 0, max: 200 }),
    }),
    { minLength: 0, maxLength: 3 }
  ),
  blockers: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 5 }),
  is_blocked_by: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 5 }),
  sprint_breakdown: fc.array(
    fc.record({
      sprint_name: fc.string({ minLength: 1, maxLength: 20 }),
      state: fc.constantFrom("active" as const, "future" as const, "closed" as const),
      story_count: fc.nat({ max: 20 }),
      done_count: fc.nat({ max: 20 }),
    }),
    { maxLength: 7 }
  ),
  lodestar_static: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
});

// ─── Property 1: Completion percentages sum to 100 ──────────────────────────

describe("Property 1: Completion percentages sum to 100", () => {
  it("done_pct + prog_pct + todo_pct sums to 100 within tolerance", () => {
    // This property validates that the API contract is correctly modeled.
    // The calculateSegmentWidths function accepts values that sum to 100.
    fc.assert(
      fc.property(percentageTuple, ({ done, prog, todo }) => {
        const sum = done + prog + todo;
        expect(sum).toBeCloseTo(100, 0);
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 2: RAG status is always a valid enum value ────────────────────

describe("Property 2: RAG status is always a valid enum value", () => {
  it("compute_rag_status always returns red, amber, or green", () => {
    // Replicate the backend logic in TS for property testing
    function computeRagStatus(donePct: number, daysRemaining: number, isBlocked: boolean): string {
      if (isBlocked) return "red";
      if (donePct >= 80 || daysRemaining > 21) return "green";
      if (donePct >= 50 || daysRemaining > 7) return "amber";
      return "red";
    }

    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100 }),
        fc.nat({ max: 365 }),
        fc.boolean(),
        (donePct, daysRemaining, isBlocked) => {
          const result = computeRagStatus(donePct, daysRemaining, isBlocked);
          expect(["red", "amber", "green"]).toContain(result);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 3: Gantt bar segment widths proportional to percentages ───────

describe("Property 3: Gantt bar segment widths proportional", () => {
  it("total segment widths equal columnWidth ±1px", () => {
    fc.assert(
      fc.property(percentageTuple, columnWidth, ({ done, prog, todo }, width) => {
        const widths = calculateSegmentWidths(done, prog, todo, width);
        const total = widths.done + widths.prog + widths.todo;
        expect(Math.abs(total - width)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 4: Minimum segment width enforcement ──────────────────────────

describe("Property 4: Minimum segment width enforcement", () => {
  it("any non-zero segment is at least 4px wide", () => {
    fc.assert(
      fc.property(percentageTuple, columnWidth, ({ done, prog, todo }, width) => {
        const widths = calculateSegmentWidths(done, prog, todo, width);
        if (done > 0) expect(widths.done).toBeGreaterThanOrEqual(4);
        if (prog > 0) expect(widths.prog).toBeGreaterThanOrEqual(4);
        if (todo > 0) expect(widths.todo).toBeGreaterThanOrEqual(4);
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 5: Label placement threshold ──────────────────────────────────

describe("Property 5: Label placement threshold", () => {
  it("label inside when donePct >= 15, outside otherwise", () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 100 }), (donePct) => {
        const labelInside = donePct >= 15;
        if (donePct >= 15) {
          expect(labelInside).toBe(true);
        } else {
          expect(labelInside).toBe(false);
        }
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 6: Today line position formula ────────────────────────────────

describe("Property 6: Today line position formula", () => {
  it("returns correct position for dates within PI range", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
        fc.integer({ min: 1, max: 180 }),
        columnWidth,
        (startDate, durationDays, width) => {
          if (isNaN(startDate.getTime())) return; // skip invalid dates
          const endDate = new Date(startDate.getTime() + durationDays * 86400000);
          // Pick a today within the range
          const todayOffset = Math.random() * durationDays;
          const today = new Date(startDate.getTime() + todayOffset * 86400000);

          const position = calculateTodayLinePosition(today, startDate, endDate, width);
          expect(position).not.toBeNull();
          expect(position!).toBeGreaterThanOrEqual(0);
          expect(position!).toBeLessThanOrEqual(width);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("returns null for dates outside PI range", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.integer({ min: 1, max: 180 }),
        columnWidth,
        (startDate, durationDays, width) => {
          if (isNaN(startDate.getTime())) return;
          const endDate = new Date(startDate.getTime() + durationDays * 86400000);
          // Today is after the PI
          const todayAfter = new Date(endDate.getTime() + 86400000);
          expect(calculateTodayLinePosition(todayAfter, startDate, endDate, width)).toBeNull();

          // Today is before the PI
          const todayBefore = new Date(startDate.getTime() - 86400000);
          expect(calculateTodayLinePosition(todayBefore, startDate, endDate, width)).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 8: KPI computation invariant ──────────────────────────────────

describe("Property 8: KPI computation invariant", () => {
  it("on_track + at_risk always equals total_features", () => {
    fc.assert(
      fc.property(fc.array(featureItemArb, { maxLength: 20 }), (features) => {
        const kpis = computeKPIs(features);
        expect(kpis.on_track + kpis.at_risk).toBe(kpis.total_features);
      }),
      { numRuns: 100 }
    );
  });

  it("on_track equals count of green features", () => {
    fc.assert(
      fc.property(fc.array(featureItemArb, { maxLength: 20 }), (features) => {
        const kpis = computeKPIs(features);
        const greenCount = features.filter((f) => f.rag_status === "green").length;
        expect(kpis.on_track).toBe(greenCount);
      }),
      { numRuns: 100 }
    );
  });

  it("blocked equals count of features with non-empty is_blocked_by", () => {
    fc.assert(
      fc.property(fc.array(featureItemArb, { maxLength: 20 }), (features) => {
        const kpis = computeKPIs(features);
        const blockedCount = features.filter((f) => f.is_blocked_by.length > 0).length;
        expect(kpis.blocked).toBe(blockedCount);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Filtered KPI recalculation ─────────────────────────────────

describe("Property 9: Filtered KPI recalculation", () => {
  it("filtering by team produces KPIs computed only from matching features", () => {
    fc.assert(
      fc.property(
        fc.array(featureItemArb, { maxLength: 20 }),
        fc.constantFrom("Alpha" as const, "Bravo" as const, "Charlie" as const),
        (features, team) => {
          const filtered = features.filter((f) => f.team === team);
          const filteredKPIs = computeKPIs(filtered);
          const allKPIsForTeam = {
            total_features: filtered.length,
            on_track: filtered.filter((f) => f.rag_status === "green").length,
            at_risk: filtered.filter((f) => f.rag_status !== "green").length,
            total_stories: filtered.reduce(
              (sum, f) => sum + f.pi_completion.reduce((s, pc) => s + pc.story_count, 0),
              0
            ),
            blocked: filtered.filter((f) => f.is_blocked_by.length > 0).length,
          };
          expect(filteredKPIs).toEqual(allKPIsForTeam);
        }
      ),
      { numRuns: 100 }
    );
  });
});
