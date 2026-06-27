/**
 * Unit tests for KPI derivation logic.
 */

import { describe, it, expect } from "vitest";
import {
  deriveOverviewKPIs,
  type PIData,
  type Finding,
  type SprintData,
} from "./derive-kpis";

function makeSprint(overrides: Partial<SprintData> = {}): SprintData {
  return {
    jira_id: 1,
    name: "Sprint 1",
    state: "active",
    start_date: "2025-01-01",
    end_date: "2025-01-14",
    total_issues: 10,
    done_issues: 7,
    blocked_issues: 1,
    pct_complete: 70,
    ...overrides,
  };
}

function makePIData(overrides: Partial<PIData> = {}): PIData {
  return {
    name: "PI-25.1",
    start_date: "2025-01-01",
    end_date: "2025-06-30",
    total_issues: 50,
    done_issues: 20,
    blocked_issues: 3,
    pct_complete: 40,
    critical_findings: 2,
    health: "amber",
    sprints: [makeSprint()],
    ...overrides,
  };
}

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    rule_id: "R001",
    severity: "critical",
    category: "delivery",
    title: "Blocked feature",
    detail: "Feature X is blocked",
    recommendation: "Unblock it",
    issue_keys: ["FEAT-1"],
    ...overrides,
  };
}

describe("deriveOverviewKPIs", () => {
  describe("null/undefined handling", () => {
    it("returns zero fallbacks when piData is null", () => {
      const result = deriveOverviewKPIs(null, []);
      expect(result.sprintVelocity).toEqual({ value: 0, delta: 0 });
      expect(result.featuresOnTrack).toEqual({ onTrack: 0, total: 0, delta: 0 });
      expect(result.daysRemaining).toEqual({ days: 0, endDate: "" });
    });

    it("returns zero fallbacks when piData is undefined", () => {
      const result = deriveOverviewKPIs(undefined, undefined);
      expect(result.sprintVelocity).toEqual({ value: 0, delta: 0 });
      expect(result.activeBlockers).toEqual({ count: 0, delta: 0 });
      expect(result.forecastConfidence).toEqual({ percentage: 0 });
    });

    it("returns zero blockers when findings is null", () => {
      const result = deriveOverviewKPIs(makePIData(), null);
      expect(result.activeBlockers).toEqual({ count: 0, delta: 0 });
    });
  });

  describe("sprintVelocity", () => {
    it("computes velocity from active sprint done_issues", () => {
      const piData = makePIData({
        sprints: [makeSprint({ state: "active", done_issues: 8, total_issues: 12 })],
      });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.sprintVelocity.value).toBe(8);
      expect(result.sprintVelocity.delta).toBe(-4); // 8 - 12
    });

    it("returns zero when no active sprint exists", () => {
      const piData = makePIData({
        sprints: [makeSprint({ state: "closed" })],
      });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.sprintVelocity).toEqual({ value: 0, delta: 0 });
    });

    it("returns zero when sprints array is empty", () => {
      const piData = makePIData({ sprints: [] });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.sprintVelocity).toEqual({ value: 0, delta: 0 });
    });
  });

  describe("featuresOnTrack", () => {
    it("counts sprints above threshold as on-track", () => {
      const piData = makePIData({
        sprints: [
          makeSprint({ pct_complete: 80 }), // on track
          makeSprint({ jira_id: 2, pct_complete: 90 }), // on track
          makeSprint({ jira_id: 3, pct_complete: 50 }), // not on track
        ],
      });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.featuresOnTrack.onTrack).toBe(2);
      expect(result.featuresOnTrack.total).toBe(3);
    });

    it("includes sprints at exactly 70% threshold", () => {
      const piData = makePIData({
        sprints: [makeSprint({ pct_complete: 70 })],
      });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.featuresOnTrack.onTrack).toBe(1);
    });

    it("excludes sprints below threshold", () => {
      const piData = makePIData({
        sprints: [makeSprint({ pct_complete: 69 })],
      });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.featuresOnTrack.onTrack).toBe(0);
    });
  });

  describe("activeBlockers", () => {
    it("counts only critical severity findings", () => {
      const findings: Finding[] = [
        makeFinding({ severity: "critical" }),
        makeFinding({ severity: "critical", rule_id: "R002" }),
        makeFinding({ severity: "warning", rule_id: "R003" }),
        makeFinding({ severity: "info", rule_id: "R004" }),
      ];
      const result = deriveOverviewKPIs(makePIData(), findings);
      expect(result.activeBlockers.count).toBe(2);
      expect(result.activeBlockers.delta).toBe(-2);
    });

    it("returns zero count and delta for no critical findings", () => {
      const findings: Finding[] = [
        makeFinding({ severity: "warning" }),
        makeFinding({ severity: "info", rule_id: "R002" }),
      ];
      const result = deriveOverviewKPIs(makePIData(), findings);
      expect(result.activeBlockers).toEqual({ count: 0, delta: 0 });
    });

    it("returns zero for empty findings array", () => {
      const result = deriveOverviewKPIs(makePIData(), []);
      expect(result.activeBlockers).toEqual({ count: 0, delta: 0 });
    });
  });

  describe("daysRemaining", () => {
    it("computes days remaining from end_date", () => {
      // Build an end date 30 days from today using local date components
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 30);
      const year = futureDate.getFullYear();
      const month = String(futureDate.getMonth() + 1).padStart(2, "0");
      const day = String(futureDate.getDate()).padStart(2, "0");
      const endDateStr = `${year}-${month}-${day}`;

      const piData = makePIData({ end_date: endDateStr });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.daysRemaining.days).toBe(30);
      expect(result.daysRemaining.endDate).toBe(endDateStr);
    });

    it("returns 0 days when end_date is in the past", () => {
      const piData = makePIData({ end_date: "2020-01-01" });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.daysRemaining.days).toBe(0);
      expect(result.daysRemaining.endDate).toBe("2020-01-01");
    });

    it("returns 0 days and empty endDate when end_date is null", () => {
      const piData = makePIData({ end_date: null });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.daysRemaining).toEqual({ days: 0, endDate: "" });
    });

    it("returns 0 days for invalid date string", () => {
      const piData = makePIData({ end_date: "not-a-date" });
      const result = deriveOverviewKPIs(piData, []);
      expect(result.daysRemaining).toEqual({ days: 0, endDate: "" });
    });
  });

  describe("forecastConfidence", () => {
    it("returns provided confidence percentage", () => {
      const result = deriveOverviewKPIs(makePIData(), [], 75);
      expect(result.forecastConfidence.percentage).toBe(75);
    });

    it("clamps to 0 when negative", () => {
      const result = deriveOverviewKPIs(makePIData(), [], -10);
      expect(result.forecastConfidence.percentage).toBe(0);
    });

    it("clamps to 100 when above 100", () => {
      const result = deriveOverviewKPIs(makePIData(), [], 150);
      expect(result.forecastConfidence.percentage).toBe(100);
    });

    it("returns 0 when not provided", () => {
      const result = deriveOverviewKPIs(makePIData(), []);
      expect(result.forecastConfidence.percentage).toBe(0);
    });

    it("returns 0 when null is provided", () => {
      const result = deriveOverviewKPIs(makePIData(), [], null);
      expect(result.forecastConfidence.percentage).toBe(0);
    });
  });
});
