/**
 * Property-based tests for Command Center V2 shared utility functions.
 *
 * Uses fast-check (v4.8.0) with Vitest.
 * Minimum 100 iterations per property test.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getDeltaColor, sortBySeverity, getHealthColor, deriveTeamStatus } from "./utils";
import React from "react";
import { render } from "@testing-library/react";
import RecentFindingsList from "./RecentFindingsList";
import type { RecentFinding } from "./RecentFindingsList";
import PIHealthSection from "./PIHealthSection";
import AttentionFindingCard from "./AttentionFindingCard";
import type { AttentionFinding } from "./types";

// Feature: command-center-v2, Property 1: Delta color mapping
describe("Property 1: Delta color mapping", () => {
  /**
   * Validates: Requirements 4.7, 4.8
   */

  it("returns teal (success) for any positive integer", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1 }), (delta) => {
        expect(getDeltaColor(delta)).toBe("var(--color-status-success)");
      }),
      { numRuns: 100 }
    );
  });

  it("returns coral (danger) for any negative integer", () => {
    fc.assert(
      fc.property(fc.integer({ max: -1 }), (delta) => {
        expect(getDeltaColor(delta)).toBe("var(--color-status-danger)");
      }),
      { numRuns: 100 }
    );
  });

  it("returns neutral (secondary) for zero", () => {
    expect(getDeltaColor(0)).toBe("var(--color-text-secondary)");
  });

  it("always returns one of three known color values for arbitrary integers", () => {
    const validColors = [
      "var(--color-status-success)",
      "var(--color-status-danger)",
      "var(--color-text-secondary)",
    ];
    fc.assert(
      fc.property(fc.integer(), (delta) => {
        expect(validColors).toContain(getDeltaColor(delta));
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: command-center-v2, Property 2: Findings severity sort order
describe("Property 2: Findings severity sort order", () => {
  /**
   * Validates: Requirements 5.2
   */

  const severityArb = fc.constantFrom("critical", "warning", "info");

  const findingArb = fc.record({
    id: fc.uuid(),
    severity: severityArb,
    title: fc.string({ minLength: 1, maxLength: 50 }),
  });

  it("critical findings always precede warning findings, and warning precede info", () => {
    fc.assert(
      fc.property(fc.array(findingArb, { minLength: 1, maxLength: 30 }), (findings) => {
        const sorted = sortBySeverity(findings);

        // Verify ordering: once we see a lower-priority severity, we should never
        // see a higher-priority one after it.
        let maxSeveritySeen = -1;
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };

        for (const item of sorted) {
          const order = severityOrder[item.severity];
          expect(order).toBeGreaterThanOrEqual(maxSeveritySeen);
          maxSeveritySeen = order;
        }
      }),
      { numRuns: 100 }
    );
  });

  it("preserves relative order within each severity level (stable sort)", () => {
    fc.assert(
      fc.property(fc.array(findingArb, { minLength: 1, maxLength: 30 }), (findings) => {
        const sorted = sortBySeverity(findings);

        // Group original items by severity in their original order
        const originalBySeverity: Record<string, typeof findings> = {
          critical: findings.filter((f) => f.severity === "critical"),
          warning: findings.filter((f) => f.severity === "warning"),
          info: findings.filter((f) => f.severity === "info"),
        };

        // Group sorted items by severity
        const sortedBySeverity: Record<string, typeof findings> = {
          critical: sorted.filter((f) => f.severity === "critical"),
          warning: sorted.filter((f) => f.severity === "warning"),
          info: sorted.filter((f) => f.severity === "info"),
        };

        // Within each severity group, the relative order should be preserved
        for (const severity of ["critical", "warning", "info"]) {
          expect(sortedBySeverity[severity]).toEqual(originalBySeverity[severity]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("does not mutate the original array", () => {
    fc.assert(
      fc.property(fc.array(findingArb, { minLength: 1, maxLength: 20 }), (findings) => {
        const original = [...findings];
        sortBySeverity(findings);
        expect(findings).toEqual(original);
      }),
      { numRuns: 100 }
    );
  });

  it("output length equals input length", () => {
    fc.assert(
      fc.property(fc.array(findingArb, { minLength: 0, maxLength: 30 }), (findings) => {
        const sorted = sortBySeverity(findings);
        expect(sorted.length).toBe(findings.length);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: command-center-v2, Property 4: Team health color mapping
describe("Property 4: Team health color mapping", () => {
  /**
   * Validates: Requirements 6.3, 6.5
   */

  it("getHealthColor returns correct color for all status values", () => {
    const statusArb = fc.constantFrom(
      "healthy" as const,
      "at-risk" as const,
      "critical" as const
    );

    fc.assert(
      fc.property(statusArb, (status) => {
        const color = getHealthColor(status);
        if (status === "healthy") {
          expect(color).toBe("var(--color-status-success)");
        } else if (status === "at-risk") {
          expect(color).toBe("var(--color-status-warning)");
        } else {
          expect(color).toBe("var(--color-status-danger)");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("getHealthColor always returns one of three known colors", () => {
    const statusArb = fc.constantFrom(
      "healthy" as const,
      "at-risk" as const,
      "critical" as const
    );
    const validColors = [
      "var(--color-status-success)",
      "var(--color-status-warning)",
      "var(--color-status-danger)",
    ];

    fc.assert(
      fc.property(statusArb, (status) => {
        expect(validColors).toContain(getHealthColor(status));
      }),
      { numRuns: 100 }
    );
  });

  it("deriveTeamStatus returns 'critical' when hasBlocker is true regardless of completion", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (completionPct) => {
        expect(deriveTeamStatus(completionPct, true)).toBe("critical");
      }),
      { numRuns: 100 }
    );
  });

  it("deriveTeamStatus returns 'critical' when completion < 30 regardless of blocker", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 29 }),
        fc.boolean(),
        (completionPct, hasBlocker) => {
          expect(deriveTeamStatus(completionPct, hasBlocker)).toBe("critical");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deriveTeamStatus returns 'at-risk' when completion is 30-59 with no blocker", () => {
    fc.assert(
      fc.property(fc.integer({ min: 30, max: 59 }), (completionPct) => {
        expect(deriveTeamStatus(completionPct, false)).toBe("at-risk");
      }),
      { numRuns: 100 }
    );
  });

  it("deriveTeamStatus returns 'healthy' when completion >= 60 with no blocker", () => {
    fc.assert(
      fc.property(fc.integer({ min: 60, max: 100 }), (completionPct) => {
        expect(deriveTeamStatus(completionPct, false)).toBe("healthy");
      }),
      { numRuns: 100 }
    );
  });

  it("deriveTeamStatus always returns a valid status for any input", () => {
    const validStatuses = ["healthy", "at-risk", "critical"];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.boolean(),
        (completionPct, hasBlocker) => {
          expect(validStatuses).toContain(deriveTeamStatus(completionPct, hasBlocker));
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: command-center-v2, Property 3: Finding rendering completeness
describe("Property 3: Finding rendering completeness", () => {
  /**
   * Validates: Requirements 5.3, 5.4, 5.5
   */

  const severityArb = fc.constantFrom("critical" as const, "warning" as const);

  const findingArb: fc.Arbitrary<AttentionFinding> = fc.record({
    id: fc.uuid(),
    severity: severityArb,
    title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,38}[A-Za-z0-9]$/).filter(
      (s) => s.length >= 2
    ),
    description: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 .,]{0,78}[A-Za-z0-9.]$/).filter(
      (s) => s.length >= 2
    ),
    recommendation: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 .,]{0,78}[A-Za-z0-9.]$/).filter(
      (s) => s.length >= 2
    ),
    category: fc.stringMatching(/^[a-z]{2,12}$/).filter((s) => s.length >= 2),
  });

  it("renders severity badge, title, description, recommendation, and action buttons for any finding", () => {
    fc.assert(
      fc.property(findingArb, (finding) => {
        const { container, unmount } = render(
          React.createElement(AttentionFindingCard, { finding })
        );

        // Severity badge is present with correct text
        const badge = container.querySelector(`[aria-label="Severity: ${finding.severity}"]`);
        expect(badge).not.toBeNull();
        expect(badge!.textContent).toBe(finding.severity);

        // Title is rendered
        const heading = container.querySelector("h3");
        expect(heading).not.toBeNull();
        expect(heading!.textContent).toBe(finding.title);

        // Description is rendered
        const description = container.querySelector("p");
        expect(description).not.toBeNull();
        expect(description!.textContent).toBe(finding.description);

        // Recommendation is rendered (inside the AI recommendation block)
        const recommendationBlock = container.querySelector(
          `[aria-label="Lodestar AI recommendation"]`
        );
        expect(recommendationBlock).not.toBeNull();
        expect(recommendationBlock!.textContent).toContain(finding.recommendation);

        // "Address" button is present
        const addressBtn = container.querySelector(
          `[aria-label="Address finding: ${finding.title}"]`
        );
        expect(addressBtn).not.toBeNull();
        expect(addressBtn!.textContent).toBe("Address");

        // "Dismiss" button is present
        const dismissBtn = container.querySelector(
          `[aria-label="Dismiss finding: ${finding.title}"]`
        );
        expect(dismissBtn).not.toBeNull();
        expect(dismissBtn!.textContent).toBe("Dismiss");

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: command-center-v2, Property 6: Recent findings badge rendering
describe("Property 6: Recent findings badge rendering", () => {
  /**
   * Validates: Requirements 7.2
   *
   * For any finding in the recent findings list, the rendered output SHALL
   * display a severity badge with the correct severity text and the finding title.
   */

  const severityArb = fc.constantFrom(
    "critical" as const,
    "warning" as const,
    "info" as const
  );

  const findingArb: fc.Arbitrary<RecentFinding> = fc.record({
    id: fc.uuid(),
    severity: severityArb,
    title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,39}[A-Za-z0-9]$/).filter(
      (s) => s.length >= 2
    ),
  });

  it("renders severity badge text and title for each finding", () => {
    fc.assert(
      fc.property(
        fc.array(findingArb, { minLength: 1, maxLength: 10 }),
        (findings) => {
          const { container, unmount } = render(
            React.createElement(RecentFindingsList, { findings })
          );

          const listItems = container.querySelectorAll("li");
          expect(listItems.length).toBe(findings.length);

          for (let i = 0; i < findings.length; i++) {
            const li = listItems[i];
            const spans = li.querySelectorAll("span");

            // First span is the severity badge
            expect(spans[0].textContent).toBe(findings[i].severity);

            // Second span is the finding title
            expect(spans[1].textContent).toBe(findings[i].title);
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: command-center-v2, Property 5: Progress bar value accuracy
describe("Property 5: Progress bar value accuracy", () => {
  /**
   * Validates: Requirements 6.2
   *
   * For any numeric percentage value, the PIHealthSection component SHALL render
   * a progress bar with aria-valuenow equal to the clamped value (0-100) and a
   * fill width proportional to the percentage.
   */

  const validTeams = [
    { name: "Team Alpha", status: "healthy" as const, completionPct: 75 },
  ];

  it("aria-valuenow matches clamped value and fill width is proportional for arbitrary percentages", () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 200 }), (pct) => {
        const clampedPct = Math.max(0, Math.min(100, pct));

        const { container, unmount } = render(
          React.createElement(PIHealthSection, {
            piName: "PI-24.3",
            overallCompletionPct: pct,
            teams: validTeams,
            daysRemaining: 30,
          })
        );

        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).not.toBeNull();

        // Verify aria-valuenow matches the clamped percentage
        expect(progressBar!.getAttribute("aria-valuenow")).toBe(
          String(clampedPct)
        );

        // Verify the fill width style is proportional to the clamped percentage
        const style = (progressBar as HTMLElement).style.width;
        expect(style).toBe(`${clampedPct}%`);

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
