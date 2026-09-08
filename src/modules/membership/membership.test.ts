import { describe, expect, it } from "vitest";
import {
  assertApplicationTransition,
  canTransitionApplication,
} from "./states";
import { assertNoInternalLeak } from "./dto";
import { MEMBERSHIP_TYPE_SEED, TRACK_SEED } from "./catalog";

describe("membership application state machine", () => {
  it("allows the documented happy path", () => {
    expect(canTransitionApplication("draft", "submitted")).toBe(true);
    expect(canTransitionApplication("submitted", "under_review")).toBe(true);
    expect(canTransitionApplication("under_review", "approved")).toBe(true);
  });

  it("rejects arbitrary status jumps", () => {
    expect(canTransitionApplication("draft", "approved")).toBe(false);
    expect(canTransitionApplication("rejected", "approved")).toBe(false);
    expect(() => assertApplicationTransition("submitted", "approved")).toThrow(
      /invalid_application_transition/,
    );
  });

  it("allows changes_requested resubmission and withdrawal from submitted", () => {
    expect(canTransitionApplication("changes_requested", "submitted")).toBe(true);
    expect(canTransitionApplication("submitted", "withdrawn")).toBe(true);
  });
});

describe("membership dto hygiene", () => {
  it("detects internal notes leakage", () => {
    expect(() => assertNoInternalLeak({ internalNotes: "secret" })).toThrow(
      "internal_notes_leak",
    );
    expect(() => assertNoInternalLeak({ status: "submitted" })).not.toThrow();
  });
});

describe("membership seed catalog", () => {
  it("includes founding and volunteer types", () => {
    expect(MEMBERSHIP_TYPE_SEED.some((t) => t.slug === "founding_member")).toBe(true);
    expect(MEMBERSHIP_TYPE_SEED.some((t) => t.slug === "volunteer_member")).toBe(true);
    expect(MEMBERSHIP_TYPE_SEED).toHaveLength(9);
    expect(TRACK_SEED).toHaveLength(8);
  });
});
