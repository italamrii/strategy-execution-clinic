import { describe, expect, it } from "vitest";
import { TRACK_OPERATING_SEED, TRACK_BADGE_SEEDS, TRACK_CONTRIBUTION_TYPES } from "./catalog";
import { planContributionTransition } from "./service";

describe("track operating catalog", () => {
  it("seeds exactly eight official tracks with stable slugs", () => {
    expect(TRACK_OPERATING_SEED).toHaveLength(8);
    expect(TRACK_OPERATING_SEED.map((t) => t.slug)).toEqual([
      "strategy",
      "execution",
      "performance",
      "institutional-excellence",
      "institutional-transformation",
      "grc",
      "human-capital",
      "ai-automation",
    ]);
    expect(TRACK_OPERATING_SEED.every((t) => t.nameAr && t.nameEn)).toBe(true);
  });

  it("defines primary-track and group-leader badge seeds", () => {
    expect(TRACK_BADGE_SEEDS.map((b) => b.slug)).toEqual([
      "track_group_leader",
      "track_primary_member",
    ]);
  });

  it("covers structured contribution types including AI automations", () => {
    expect(TRACK_CONTRIBUTION_TYPES.some((t) => t.slug === "ai_automation")).toBe(true);
    expect(TRACK_CONTRIBUTION_TYPES.some((t) => t.slug === "volunteer_task")).toBe(true);
    expect(TRACK_CONTRIBUTION_TYPES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("contribution lifecycle transitions", () => {
  it("allows the happy path draft → published/completed", () => {
    expect(planContributionTransition("draft", "submitted")).toBe(true);
    expect(planContributionTransition("submitted", "under_review")).toBe(true);
    expect(planContributionTransition("under_review", "approved")).toBe(true);
    expect(planContributionTransition("approved", "published")).toBe(true);
    expect(planContributionTransition("published", "completed")).toBe(true);
  });

  it("supports changes_requested, rejected, archived, and cancelled", () => {
    expect(planContributionTransition("under_review", "changes_requested")).toBe(true);
    expect(planContributionTransition("changes_requested", "submitted")).toBe(true);
    expect(planContributionTransition("under_review", "rejected")).toBe(true);
    expect(planContributionTransition("approved", "archived")).toBe(true);
    expect(planContributionTransition("draft", "cancelled")).toBe(true);
  });

  it("rejects privilege-like status jumps", () => {
    expect(planContributionTransition("draft", "approved")).toBe(false);
    expect(planContributionTransition("submitted", "published")).toBe(false);
    expect(planContributionTransition("rejected", "published")).toBe(false);
    expect(planContributionTransition("archived", "submitted")).toBe(false);
  });
});
