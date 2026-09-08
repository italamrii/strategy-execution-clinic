import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import EmbeddedPostgres from "@/shared/testing/embedded-postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { v7 as uuidv7 } from "uuid";
import { closeDb, getDb, resetDb } from "@/shared/db/client";
import {
  badgeAwards,
  certificates,
  contributionTypes,
  credentials,
  memberships,
  membershipTypes,
  profiles,
  roles,
  userRoles,
  users,
} from "@/shared/db/schema";
import { seedRbacCatalog, getPermissionsForUser } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { issueMembershipDirectly, seedMembershipCatalog } from "@/modules/membership";
import {
  activateVolunteerProfile,
  applyToOpportunity,
  createOpportunity,
  listApplicationsForAdmin,
  reviewApplication,
  reviewVolunteerHours,
  seedVolunteerCatalog,
  submitVolunteerHours,
  transitionOpportunity,
  requireVolunteerEvidenceAccess,
} from "@/modules/volunteering";
import {
  awardBadge,
  getImpactBreakdown,
  getPublicMemberProfileByCredentialCode,
  issueCertificate,
  listDirectoryMembers,
  publicMemberProfileLeaksPrivate,
  reviewContribution,
  revokeCertificate,
  revokeContribution,
  seedRecognitionCatalog,
  submitContribution,
  updateImpactWeight,
  updateMilestoneDefinition,
  listMilestoneDefinitionsForAdmin,
  verifyBadgePublicCode,
  verifyCertificatePublicCode,
} from "@/modules/recognition";

const PORT = 55500 + ((process.pid + 6) % 700);
const DATA_DIR = path.resolve(process.cwd(), ".data", `pg-recognition-test-${process.pid}`);

async function createUser(email: string) {
  const db = getDb();
  const id = uuidv7();
  await db.insert(users).values({
    id,
    email,
    emailVerifiedAt: new Date(),
    locale: "ar",
    status: "active",
  });
  return id;
}

async function grantRole(userId: string, slug: string) {
  const db = getDb();
  const role = await db.query.roles.findFirst({ where: eq(roles.slug, slug) });
  await db.insert(userRoles).values({
    id: uuidv7(),
    userId,
    roleId: role!.id,
    organizationId: null,
    grantedBy: userId,
  });
}

describe("phase 5 recognition + volunteer scope", () => {
  let pg: EmbeddedPostgres;
  let adminId = "";
  let leaderA = "";
  let leaderB = "";
  let memberId = "";

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-phase5";
    await mkdir(DATA_DIR, { recursive: true });
    await rm(DATA_DIR, { recursive: true, force: true });
    await mkdir(DATA_DIR, { recursive: true });
    pg = new EmbeddedPostgres({
      databaseDir: DATA_DIR,
      user: "clinic",
      password: "clinic",
      port: PORT,
      persistent: false,
    });
    await pg.initialise();
    await pg.start();
    try {
      await pg.createDatabase("clinic");
    } catch {
      // exists
    }
    const url = `postgres://clinic:clinic@127.0.0.1:${PORT}/clinic`;
    process.env.DATABASE_URL = url;
    const sql = postgres(url, { max: 1 });
    await migrate(drizzle(sql), {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
    await sql.end({ timeout: 5 });
    await resetDb(url);
    await seedRbacCatalog();
    await seedMembershipCatalog();
    await seedVolunteerCatalog();
    await seedRecognitionCatalog();

    adminId = await createUser(`p5-admin-${Date.now()}@clinic.test`);
    leaderA = await createUser(`p5-leader-a-${Date.now()}@clinic.test`);
    leaderB = await createUser(`p5-leader-b-${Date.now()}@clinic.test`);
    memberId = await createUser(`p5-member-${Date.now()}@clinic.test`);
    await grantRole(adminId, "super_admin");
    await grantRole(leaderA, "volunteer_leader");
    await grantRole(leaderB, "volunteer_leader");
    await grantRole(leaderA, "member");
    await grantRole(leaderB, "member");
    await grantRole(memberId, "member");

    const db = getDb();
    const volunteerType = await db.query.membershipTypes.findFirst({
      where: eq(membershipTypes.slug, "volunteer_member"),
    });
    for (const uid of [leaderA, leaderB, memberId, adminId]) {
      await issueMembershipDirectly({
        actorUserId: adminId,
        targetUserId: uid,
        membershipTypeId: volunteerType!.id,
        trackIds: [],
        reason: "Phase 5 fixture",
      });
    }
    await activateVolunteerProfile({ actorUserId: memberId });
    await activateVolunteerProfile({ actorUserId: leaderA });
    await activateVolunteerProfile({ actorUserId: leaderB });
  }, 120_000);

  afterAll(async () => {
    await closeDb();
    await pg?.stop();
  });

  it("isolates volunteer leader opportunity scope", async () => {
    const oppA = await createOpportunity({
      actorUserId: leaderA,
      data: {
        titleAr: "فرصة أ",
        titleEn: "Opp A",
        locationType: "remote",
        visibility: "public",
        maxParticipants: 5,
      },
    });
    await transitionOpportunity({
      actorUserId: leaderA,
      opportunityId: oppA,
      toStatus: "published",
    });
    const oppB = await createOpportunity({
      actorUserId: leaderB,
      data: {
        titleAr: "فرصة ب",
        titleEn: "Opp B",
        locationType: "remote",
        visibility: "public",
        maxParticipants: 5,
      },
    });
    await transitionOpportunity({
      actorUserId: leaderB,
      opportunityId: oppB,
      toStatus: "published",
    });

    const appB = await applyToOpportunity({
      actorUserId: memberId,
      opportunityId: oppB,
      motivation: "Applying to leader B opportunity for scope isolation verification.",
    });

    await expect(
      reviewApplication({
        actorUserId: leaderA,
        applicationId: appB,
        decision: "accepted",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    const listedA = await listApplicationsForAdmin({ actorUserId: leaderA });
    expect(listedA.items.every((a) => a.opportunityId === oppA)).toBe(true);

    await reviewApplication({
      actorUserId: leaderB,
      applicationId: appB,
      decision: "accepted",
    });

    const evidenceId = uuidv7();
    const entryId = await submitVolunteerHours({
      actorUserId: memberId,
      opportunityId: oppB,
      hours: 3,
      activityDate: "2026-08-10",
      description: "Scoped hour submission for leader isolation test case.",
      evidenceMediaId: evidenceId,
    });
    await expect(
      reviewVolunteerHours({
        actorUserId: leaderA,
        entryId,
        decision: "approved",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await expect(
      requireVolunteerEvidenceAccess({ actorUserId: leaderA, entryId }),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await requireVolunteerEvidenceAccess({ actorUserId: leaderB, entryId });
    await requireVolunteerEvidenceAccess({ actorUserId: memberId, entryId });

    await reviewVolunteerHours({
      actorUserId: adminId,
      entryId,
      decision: "approved",
    });

    await expect(
      transitionOpportunity({
        actorUserId: leaderA,
        opportunityId: oppB,
        toStatus: "cancelled",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("runs contribution approval, impact, badge, certificate lifecycle", async () => {
    const db = getDb();
    const type = await db.query.contributionTypes.findFirst({
      where: eq(contributionTypes.slug, "article"),
    });
    const contribId = await submitContribution({
      actorUserId: memberId,
      contributionTypeId: type!.id,
      titleAr: "مقالة اختبار",
      titleEn: "Test article",
      visibility: "public",
    });

    await expect(
      reviewContribution({
        actorUserId: memberId,
        contributionId: contribId,
        decision: "approved",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await reviewContribution({
      actorUserId: adminId,
      contributionId: contribId,
      decision: "approved",
    });

    const impact = await getImpactBreakdown(memberId);
    expect(impact.approvedContributions).toBeGreaterThan(0);
    const afterApproval = impact.total;

    const rejectedId = await submitContribution({
      actorUserId: memberId,
      contributionTypeId: type!.id,
      titleAr: "مرفوض",
      titleEn: "Rejected article",
      visibility: "public",
    });
    await reviewContribution({
      actorUserId: adminId,
      contributionId: rejectedId,
      decision: "rejected",
    });
    const afterReject = await getImpactBreakdown(memberId);
    expect(afterReject.total).toBe(afterApproval);

    const privateId = await submitContribution({
      actorUserId: memberId,
      contributionTypeId: type!.id,
      titleAr: "خاص",
      titleEn: "Private article",
      visibility: "private",
    });
    await reviewContribution({
      actorUserId: adminId,
      contributionId: privateId,
      decision: "approved",
    });

    await expect(
      updateImpactWeight({
        actorUserId: memberId,
        eventKind: "approved_contribution",
        weight: 999,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await updateImpactWeight({
      actorUserId: adminId,
      eventKind: "approved_contribution",
      weight: 1,
    });

    const milestones = await listMilestoneDefinitionsForAdmin();
    expect(milestones.length).toBeGreaterThan(0);
    const firstMilestone = milestones[0]!;
    await expect(
      updateMilestoneDefinition({
        actorUserId: memberId,
        milestoneId: firstMilestone.id,
        patch: { nameEn: "Unauthorized milestone edit" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await updateMilestoneDefinition({
      actorUserId: adminId,
      milestoneId: firstMilestone.id,
      patch: { nameEn: "Updated milestone label" },
    });
    const updated = await listMilestoneDefinitionsForAdmin();
    expect(updated.find((m) => m.id === firstMilestone.id)?.nameEn).toBe(
      "Updated milestone label",
    );

    const badgeId = await awardBadge({
      actorUserId: null,
      badgeSlug: "contributor",
      userId: memberId,
      reason: "automatic",
      automatic: true,
    });
    const badgeId2 = await awardBadge({
      actorUserId: null,
      badgeSlug: "contributor",
      userId: memberId,
      reason: "automatic",
      automatic: true,
    });
    expect(badgeId2).toBe(badgeId);

    await expect(
      awardBadge({
        actorUserId: memberId,
        badgeSlug: "ai_pioneer",
        userId: memberId,
        reason: "self award attempt",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await awardBadge({
      actorUserId: adminId,
      badgeSlug: "volunteer_leader",
      userId: memberId,
      reason: "manual recognition",
    });
    const perms = await getPermissionsForUser(memberId);
    expect(perms.includes("volunteer.hours.review")).toBe(false);
    expect(perms.includes("admin.dashboard.read")).toBe(false);

    const certId = await issueCertificate({
      actorUserId: adminId,
      definitionSlug: "approved_contribution",
      userId: memberId,
      sourceType: "contribution",
      sourceId: contribId,
    });
    const certAgain = await issueCertificate({
      actorUserId: adminId,
      definitionSlug: "approved_contribution",
      userId: memberId,
      sourceType: "contribution",
      sourceId: contribId,
    });
    expect(certAgain).toBe(certId);

    const issued = await db.query.certificates.findFirst({
      where: eq(certificates.id, certId),
    });
    const verified = await verifyCertificatePublicCode(issued!.publicCode);
    expect(verified?.status).toBe("ACTIVE");

    await revokeCertificate({
      actorUserId: adminId,
      certificateId: certId,
      reason: "Test revocation",
    });
    const revoked = await verifyCertificatePublicCode(issued!.publicCode);
    expect(revoked?.status).toBe("REVOKED");

    const mem = await db.query.memberships.findFirst({
      where: eq(memberships.userId, memberId),
    });
    const cred = await db.query.credentials.findFirst({
      where: eq(credentials.membershipId, mem!.id),
    });
    if (cred) {
      const profile = await getPublicMemberProfileByCredentialCode(cred.publicCode);
      expect(profile).toBeTruthy();
      expect(publicMemberProfileLeaksPrivate(profile!)).toBe(false);
      expect(profile!.contributions.some((c) => c.titleEn === "Test article")).toBe(true);
      expect(profile!.contributions.some((c) => c.titleEn === "Private article")).toBe(false);
      expect(JSON.stringify(profile)).not.toContain(memberId);
    }

    await db.insert(profiles).values({
      id: uuidv7(),
      userId: memberId,
      displayNameAr: "عضو الاختبار",
      displayNameEn: "Test Member",
      headlineAr: "مساهم",
      headlineEn: "Test contributor",
      visibility: "public",
      directoryOptIn: true,
    });
    const directory = await listDirectoryMembers({ page: 1, clientKey: "test-dir" });
    expect(directory.items.some((item) => item.publicCode === cred?.publicCode)).toBe(true);

    const beforeRevoke = await getImpactBreakdown(memberId);
    await revokeContribution({
      actorUserId: adminId,
      contributionId: contribId,
      reason: "Revoke for impact verification",
    });
    const afterRevoke = await getImpactBreakdown(memberId);
    expect(afterRevoke.total).toBeLessThan(beforeRevoke.total);

    const badgeAward = await db.query.badgeAwards.findFirst({
      where: eq(badgeAwards.userId, memberId),
    });
    if (badgeAward?.publicCode) {
      const badgeDto = await verifyBadgePublicCode(badgeAward.publicCode);
      expect(badgeDto?.verified).toBe(true);
    }
  });
});
