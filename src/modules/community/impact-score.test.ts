import { describe, expect, it } from "vitest";
import { calculateImpactScore } from "./impact-score";

describe("impact score", () => {
  it("is derived from events and ignores revoked rows", () => {
    const score = calculateImpactScore(
      [
        { kind: "volunteer_hours", value: 10, revokedAt: null },
        { kind: "volunteer_hours", value: 5, revokedAt: new Date() },
        { kind: "badge", value: 1, revokedAt: null },
      ],
      [
        { eventKind: "volunteer_hours", weight: 2, isEnabled: true },
        { eventKind: "badge", weight: 50, isEnabled: true },
      ],
    );
    expect(score).toBe(70);
  });
});
