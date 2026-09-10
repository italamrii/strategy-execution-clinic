import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSION_MAP, ROLE_SEEDS } from "./catalog";

const REQUIRED_PERMISSIONS = [
  "admin.dashboard.read",
  "admin.settings.manage",
  "rbac.role.read",
  "rbac.role.grant",
  "membership.read.any",
  "membership.manage",
  "membership.application.read.any",
  "membership.application.review",
  "membership.type.manage",
  "track.read",
  "track.manage",
  "track.member.manage",
  "consultation.create",
  "consultation.read.own",
  "consultation.read.any",
  "consultation.manage",
  "meeting.read.own",
  "meeting.manage",
  "meeting.start",
  "card.read.own",
  "card.template.manage",
  "support.request.create",
  "support.request.read.any",
  "credential.read.own",
  "credential.issue",
  "content.read",
  "content.write",
  "announcement.manage",
  "volunteer.manage",
  "contribution.read.any",
  "contribution.review",
  "audit.read",
  "analytics.read",
] as const;

const REQUIRED_ROLES = [
  "super_admin",
  "platform_admin",
  "content_manager",
  "membership_admin",
  "track_lead",
  "expert",
  "founder",
  "volunteer",
  "member",
  "auditor",
] as const;

describe("RBAC catalog", () => {
  it("contains every required permission", () => {
    for (const permission of REQUIRED_PERMISSIONS) {
      expect(PERMISSIONS).toContain(permission);
    }
  });

  it("contains every required role", () => {
    const slugs = ROLE_SEEDS.map((role) => role.slug);
    for (const slug of REQUIRED_ROLES) {
      expect(slugs).toContain(slug);
    }
  });

  it("gives super_admin every catalog permission", () => {
    expect(ROLE_PERMISSION_MAP.super_admin).toEqual([...PERMISSIONS]);
  });

  it("does not let expert or founder open the global admin dashboard", () => {
    expect(ROLE_PERMISSION_MAP.expert).not.toContain("admin.dashboard.read");
    expect(ROLE_PERMISSION_MAP.founder).not.toContain("admin.dashboard.read");
    expect(ROLE_PERMISSION_MAP.volunteer).not.toContain("admin.dashboard.read");
    expect(ROLE_PERMISSION_MAP.member).not.toContain("admin.dashboard.read");
  });

  it("scopes track leaders away from global membership and settings control", () => {
    expect(ROLE_PERMISSION_MAP.track_lead).toContain("track.member.manage");
    expect(ROLE_PERMISSION_MAP.track_lead).toContain("meeting.start");
    expect(ROLE_PERMISSION_MAP.track_lead).not.toContain("admin.settings.manage");
    expect(ROLE_PERMISSION_MAP.track_lead).not.toContain("membership.manage");
    expect(ROLE_PERMISSION_MAP.track_lead).not.toContain("consultation.read.any");
  });

  it("assigns content and membership admin permissions correctly", () => {
    expect(ROLE_PERMISSION_MAP.content_manager).toContain("content.write");
    expect(ROLE_PERMISSION_MAP.content_manager).toContain("admin.dashboard.read");
    expect(ROLE_PERMISSION_MAP.membership_admin).toContain("membership.manage");
    expect(ROLE_PERMISSION_MAP.auditor).toContain("audit.read");
    expect(ROLE_PERMISSION_MAP.auditor).not.toContain("rbac.role.grant");
  });
});
