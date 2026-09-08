import { describe, expect, it } from "vitest";
import { isFlagEnabled } from "./flags";

describe("feature flags", () => {
  it("defaults volunteering on and payments off", () => {
    expect(isFlagEnabled("VOLUNTEERING", {})).toBe(true);
    expect(isFlagEnabled("PAYMENTS", {})).toBe(false);
    expect(isFlagEnabled("AI", { FLAG_AI: "true" })).toBe(true);
  });
});
