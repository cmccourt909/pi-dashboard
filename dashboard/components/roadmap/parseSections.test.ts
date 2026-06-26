import { describe, expect, it } from "vitest";
import { hasStructuredSections, parseSections } from "./parseSections";

describe("parseSections", () => {
  it("parses all three sections in order", () => {
    const raw = `Delivery Status: On track for Sprint 3.

Risks & Blockers: None identified.

Recommended Actions: Continue monitoring velocity.`;

    const result = parseSections(raw);
    expect(result.deliveryStatus).toBe("On track for Sprint 3.");
    expect(result.risksAndBlockers).toBe("None identified.");
    expect(result.recommendedActions).toBe("Continue monitoring velocity.");
  });

  it("parses headers in any order", () => {
    const raw = `Recommended Actions: Schedule review.

Delivery Status: At risk.

Risks & Blockers: Blocked by BRAVO-200.`;

    const result = parseSections(raw);
    expect(result.deliveryStatus).toBe("At risk.");
    expect(result.risksAndBlockers).toBe("Blocked by BRAVO-200.");
    expect(result.recommendedActions).toBe("Schedule review.");
  });

  it("is case-insensitive for headers", () => {
    const raw = `delivery status: ok
Risks & blockers: none
recommended actions: monitor`;

    const result = parseSections(raw);
    expect(result.deliveryStatus).toBe("ok");
    expect(result.risksAndBlockers).toBe("none");
    expect(result.recommendedActions).toBe("monitor");
  });

  it("returns empty strings for empty input", () => {
    const result = parseSections("");
    expect(result.deliveryStatus).toBe("");
    expect(result.risksAndBlockers).toBe("");
    expect(result.recommendedActions).toBe("");
  });

  it("falls back to deliveryStatus when no headers are present", () => {
    const raw = "Feature is on track for delivery in Sprint 3.";
    const result = parseSections(raw);
    expect(result.deliveryStatus).toBe(raw);
    expect(result.risksAndBlockers).toBe("");
    expect(result.recommendedActions).toBe("");
  });

  it("handles empty sections gracefully", () => {
    const raw = `Delivery Status: ok
Risks & Blockers:
Recommended Actions: monitor`;

    const result = parseSections(raw);
    expect(result.deliveryStatus).toBe("ok");
    expect(result.risksAndBlockers).toBe("");
    expect(result.recommendedActions).toBe("monitor");
  });
});

describe("hasStructuredSections", () => {
  it("returns true when a sentinel header is present", () => {
    expect(
      hasStructuredSections("Delivery Status: on track")
    ).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(
      hasStructuredSections("Feature is on track for Sprint 3.")
    ).toBe(false);
  });

  it("returns false for null", () => {
    expect(hasStructuredSections(null)).toBe(false);
  });
});
