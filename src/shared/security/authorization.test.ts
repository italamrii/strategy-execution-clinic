import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  assertCanApproveMembershipApplication,
  assertCanIssueMembership,
  assertCanReviewHours,
  assertCanReviewMembershipApplication,
  ignoreClientRoleEscalation,
} from "./authorization";

const reviewer = {
  id: "reviewer-1",
  permissions: [
    "membership.application.review",
    "membership.application.approve",
    "volunteer.hours.review",
    "membership.issue",
  ],
};
const member = { id: "member-1", permissions: [] };

describe("authorization invariants", () => {
  it("blocks a member from approving their own application", () => {
    expect(() =>
      assertCanReviewMembershipApplication(reviewer, { userId: reviewer.id }),
    ).toThrow(AuthorizationError);
    expect(() =>
      assertCanApproveMembershipApplication(reviewer, { userId: reviewer.id }),
    ).toThrow(AuthorizationError);
  });

  it("blocks a volunteer from approving their own hours", () => {
    expect(() => assertCanReviewHours(reviewer, { userId: reviewer.id })).toThrow(
      AuthorizationError,
    );
  });

  it("blocks a member without issue permission from issuing memberships", () => {
    expect(() => assertCanIssueMembership(member)).toThrow(AuthorizationError);
  });

  it("allows a permissioned reviewer to review someone else", () => {
    expect(() =>
      assertCanReviewHours(reviewer, { userId: member.id }),
    ).not.toThrow();
  });

  it("strips client-supplied role escalation fields", () => {
    const safe = ignoreClientRoleEscalation({
      displayNameAr: "عبدالله",
      role: "super_admin",
      roleId: "x",
    });
    expect(safe).toEqual({ displayNameAr: "عبدالله" });
    expect("role" in safe).toBe(false);
  });
});
