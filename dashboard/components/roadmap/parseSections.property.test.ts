import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import type { NarrativeSections } from "./parseSections";
import { parseSections } from "./parseSections";

describe("parseSections properties", () => {
  it("is deterministic for the same input", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        (raw) => {
          const first = parseSections(raw);
          const second = parseSections(raw);
          expect(first).toEqual(second);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("isolates sections correctly regardless of header order", () => {
    // Base64 bodies never contain header words or colons, so they cannot
    // accidentally trigger a mis-parse.
    const sectionBody = fc.base64String({ minLength: 4, maxLength: 100 });

    fc.assert(
      fc.property(
        sectionBody,
        sectionBody,
        sectionBody,
        fc.shuffledSubarray(
          [
            ["Delivery Status:", "deliveryStatus"] as const,
            ["Risks & Blockers:", "risksAndBlockers"] as const,
            ["Recommended Actions:", "recommendedActions"] as const,
          ],
          { minLength: 3, maxLength: 3 }
        ),
        (a, b, c, order) => {
          const bodies = [a, b, c];
          const raw = order
            .map(([header], idx) => `${header} ${bodies[idx]}`)
            .join("\n\n");

          const expected: NarrativeSections = {
            deliveryStatus: "",
            risksAndBlockers: "",
            recommendedActions: "",
          };
          order.forEach(([, key], idx) => {
            expected[key] = bodies[idx];
          });

          const result = parseSections(raw);
          expect(result.deliveryStatus).toContain(expected.deliveryStatus);
          expect(result.risksAndBlockers).toContain(expected.risksAndBlockers);
          expect(result.recommendedActions).toContain(
            expected.recommendedActions
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("never returns undefined values", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        (raw) => {
          const result = parseSections(raw);
          expect(typeof result.deliveryStatus).toBe("string");
          expect(typeof result.risksAndBlockers).toBe("string");
          expect(typeof result.recommendedActions).toBe("string");
        }
      ),
      { numRuns: 100 }
    );
  });
});
