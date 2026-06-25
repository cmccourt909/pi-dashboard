import { computeKPIs } from "./SummaryStrip";
import { FeatureItem } from "@/types/roadmap";

/** Helper to create a minimal FeatureItem for testing. */
function makeFeature(overrides: Partial<FeatureItem> = {}): FeatureItem {
  return {
    feature_key: "TEST-1",
    summary: "Test feature",
    team: "Alpha",
    assignee: null,
    status: "In Progress",
    status_category: "indeterminate",
    rag_status: "green",
    pi_completion: [],
    blockers: [],
    is_blocked_by: [],
    sprint_breakdown: [],
    lodestar_static: null,
    ...overrides,
  };
}

describe("computeKPIs", () => {
  it("returns zeroes for an empty feature set", () => {
    const result = computeKPIs([]);
    expect(result).toEqual({
      total_features: 0,
      on_track: 0,
      at_risk: 0,
      total_stories: 0,
      blocked: 0,
    });
  });

  it("counts total features correctly", () => {
    const features = [makeFeature(), makeFeature(), makeFeature()];
    expect(computeKPIs(features).total_features).toBe(3);
  });

  it("counts on_track as features with rag_status green", () => {
    const features = [
      makeFeature({ rag_status: "green" }),
      makeFeature({ rag_status: "green" }),
      makeFeature({ rag_status: "amber" }),
    ];
    expect(computeKPIs(features).on_track).toBe(2);
  });

  it("counts at_risk as features with rag_status amber or red", () => {
    const features = [
      makeFeature({ rag_status: "green" }),
      makeFeature({ rag_status: "amber" }),
      makeFeature({ rag_status: "red" }),
    ];
    expect(computeKPIs(features).at_risk).toBe(2);
  });

  it("sums total_stories from all pi_completion entries across features", () => {
    const features = [
      makeFeature({
        pi_completion: [
          { pi_name: "26.2", done_pct: 50, prog_pct: 30, todo_pct: 20, story_count: 5, sp_done: 10, sp_total: 20 },
          { pi_name: "26.3", done_pct: 10, prog_pct: 20, todo_pct: 70, story_count: 3, sp_done: 2, sp_total: 10 },
        ],
      }),
      makeFeature({
        pi_completion: [
          { pi_name: "26.2", done_pct: 80, prog_pct: 10, todo_pct: 10, story_count: 7, sp_done: 14, sp_total: 18 },
        ],
      }),
    ];
    expect(computeKPIs(features).total_stories).toBe(15); // 5 + 3 + 7
  });

  it("counts blocked as features with non-empty is_blocked_by", () => {
    const features = [
      makeFeature({ is_blocked_by: ["OTHER-1"] }),
      makeFeature({ is_blocked_by: [] }),
      makeFeature({ is_blocked_by: ["OTHER-2", "OTHER-3"] }),
    ];
    expect(computeKPIs(features).blocked).toBe(2);
  });

  it("on_track + at_risk always equals total_features", () => {
    const features = [
      makeFeature({ rag_status: "green" }),
      makeFeature({ rag_status: "amber" }),
      makeFeature({ rag_status: "red" }),
      makeFeature({ rag_status: "green" }),
    ];
    const kpis = computeKPIs(features);
    expect(kpis.on_track + kpis.at_risk).toBe(kpis.total_features);
  });
});
