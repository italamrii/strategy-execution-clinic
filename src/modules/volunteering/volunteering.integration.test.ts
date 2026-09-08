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
import { auditLogs, membershipTypes, roles, userRoles, users } from "@/shared/db/schema";
import { seedRbacCatalog } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { issueMembershipDirectly, seedMembershipCatalog } from "@/modules/membership";
import { VolunteerError } from "@/modules/volunteering/errors";
import {
  activateVolunteerProfile,
  adjustVolunteerHours,
  applyToOpportunity,
  assertEligibleVolunteerMembership,
  createOpportunity,
  getApprovedHoursForUser,
  getVolunteerDashboard,
  reviewApplication,
  reviewVolunteerHours,
  seedVolunteerCatalog,
  submitVolunteerHours,
  transitionOpportunity,
} from "@/modules/volunteering/service";

const PORT = 55450 + ((process.pid + 4) % 800);
const DATA_DIR = path.resolve(process.cwd(), ".data", `pg-volunteer-test-${process.pid}`);

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

async function grantSuperAdmin(userId: string) {
  const db = getDb();
  const role = await db.query.roles.findFirst({
    where: eq(roles.slug, "super_admin"),
  });
  await db.insert(userRoles).values({
    id: uuidv7(),
    userId,
    roleId: role!.id,
    organizationId: null,
    grantedBy: userId,
  });
}

async function grantVolunteerMembership(actorUserId: string, userId: string) {
  const db = getDb();
  const type = await db.query.membershipTypes.findFirst({
    where: eq(membershipTypes.slug, "volunteer_member"),
  });
  await issueMembershipDirectly({
    actorUserId,
    targetUserId: userId,
    membershipTypeId: type!.id,
    trackIds: [],
    reason: "Volunteer integration test fixture",
  });
}

describe("volunteering integration", () => {
  let pg: EmbeddedPostgres;
  let adminId = "";
  let volunteerId = "";
  let reviewerId = "";

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-phase4";
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

    adminId = await createUser(`vol-admin-${Date.now()}@clinic.test`);
    volunteerId = await createUser(`vol-member-${Date.now()}@clinic.test`);
    reviewerId = await createUser(`vol-reviewer-${Date.now()}@clinic.test`);
    await grantSuperAdmin(adminId);
    await grantVolunteerMembership(adminId, volunteerId);
    await grantVolunteerMembership(adminId, adminId);
    await grantVolunteerMembership(adminId, reviewerId);
  }, 120_000);

  afterAll(async () => {
    await closeDb();
    await pg?.stop();
  });

  it("activates volunteer profile for eligible member", async () => {
    const id = await activateVolunteerProfile({ actorUserId: volunteerId });
    expect(id).toBeTruthy();
    const dashboard = await getVolunteerDashboard(volunteerId);
    expect(dashboard.hasProfile).toBe(true);
  });

  it("blocks ineligible membership", async () => {
    const outsider = await createUser(`vol-outsider-${Date.now()}@clinic.test`);
    await expect(assertEligibleVolunteerMembership(outsider)).rejects.toBeInstanceOf(
      VolunteerError,
    );
  });

  it("runs opportunity application and hour ledger workflow", async () => {
    const oppId = await createOpportunity({
      actorUserId: adminId,
      data: {
        titleAr: "فرصة اختبار",
        titleEn: "Test opportunity",
        descriptionAr: "وصف",
        descriptionEn: "Description",
        locationType: "remote",
        maxParticipants: 2,
        visibility: "public",
      },
    });
    await transitionOpportunity({
      actorUserId: adminId,
      opportunityId: oppId,
      toStatus: "published",
    });

    const appId = await applyToOpportunity({
      actorUserId: volunteerId,
      opportunityId: oppId,
      motivation: "I want to contribute meaningfully to clinic operations and learning.",
    });

    await expect(
      applyToOpportunity({
        actorUserId: volunteerId,
        opportunityId: oppId,
        motivation: "Duplicate should be blocked by unique constraint on applications.",
      }),
    ).rejects.toBeInstanceOf(VolunteerError);

    await reviewApplication({
      actorUserId: adminId,
      applicationId: appId,
      decision: "accepted",
    });

    const entryId = await submitVolunteerHours({
      actorUserId: volunteerId,
      opportunityId: oppId,
      hours: 6,
      activityDate: "2026-08-01",
      description: "Facilitated workshop planning and documentation work.",
    });

    await expect(
      reviewVolunteerHours({
        actorUserId: volunteerId,
        entryId,
        decision: "approved",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await reviewVolunteerHours({
      actorUserId: adminId,
      entryId,
      decision: "approved",
    });

    let approved = await getApprovedHoursForUser(volunteerId);
    expect(approved).toBe(6);

    await expect(
      reviewVolunteerHours({
        actorUserId: adminId,
        entryId,
        decision: "approved",
      }),
    ).rejects.toBeInstanceOf(VolunteerError);
    approved = await getApprovedHoursForUser(volunteerId);
    expect(approved).toBe(6);

    await adjustVolunteerHours({
      actorUserId: adminId,
      entryId,
      deltaHours: -2,
      reason: "Corrected overstated workshop facilitation time.",
    });
    approved = await getApprovedHoursForUser(volunteerId);
    expect(approved).toBe(4);

    const dashboard = await getVolunteerDashboard(volunteerId);
    expect(dashboard.hasProfile).toBe(true);
    if (dashboard.hasProfile) {
      expect(dashboard.profile.approvedHours).toBe(4);
      expect(dashboard.adjustments.length).toBeGreaterThan(0);
    }

    const db = getDb();
    const audits = await db.query.auditLogs.findMany({
      where: eq(auditLogs.action, "VOLUNTEER_HOURS_APPROVED"),
    });
    expect(audits.length).toBeGreaterThan(0);
  });

  it("enforces capacity with concurrency-safe acceptance", async () => {
    const userA = await createUser(`vol-a-${Date.now()}@clinic.test`);
    const userB = await createUser(`vol-b-${Date.now()}@clinic.test`);
    const userC = await createUser(`vol-c-${Date.now()}@clinic.test`);
    await grantVolunteerMembership(adminId, userA);
    await grantVolunteerMembership(adminId, userB);
    await grantVolunteerMembership(adminId, userC);
    await activateVolunteerProfile({ actorUserId: userA });
    await activateVolunteerProfile({ actorUserId: userB });
    await activateVolunteerProfile({ actorUserId: userC });

    const oppId = await createOpportunity({
      actorUserId: adminId,
      data: {
        titleAr: "سعة واحدة",
        titleEn: "Single seat",
        locationType: "remote",
        maxParticipants: 1,
        visibility: "public",
      },
    });
    await transitionOpportunity({
      actorUserId: adminId,
      opportunityId: oppId,
      toStatus: "published",
    });

    const appA = await applyToOpportunity({
      actorUserId: userA,
      opportunityId: oppId,
      motivation: "Ready to contribute with documented facilitation experience here.",
    });
    const appB = await applyToOpportunity({
      actorUserId: userB,
      opportunityId: oppId,
      motivation: "Also ready to contribute with strong operations support background.",
    });
    const appC = await applyToOpportunity({
      actorUserId: userC,
      opportunityId: oppId,
      motivation: "Third applicant should lose race when capacity is only one seat.",
    });

    const results = await Promise.allSettled([
      reviewApplication({ actorUserId: adminId, applicationId: appA, decision: "accepted" }),
      reviewApplication({ actorUserId: adminId, applicationId: appB, decision: "accepted" }),
      reviewApplication({ actorUserId: adminId, applicationId: appC, decision: "accepted" }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(2);
  });

  it("blocks negative effective total on adjustment", async () => {
    const user = await createUser(`vol-neg-${Date.now()}@clinic.test`);
    await grantVolunteerMembership(adminId, user);
    await activateVolunteerProfile({ actorUserId: user });
    const oppId = await createOpportunity({
      actorUserId: adminId,
      data: {
        titleAr: "ساعات",
        titleEn: "Hours",
        locationType: "remote",
        visibility: "public",
      },
    });
    await transitionOpportunity({
      actorUserId: adminId,
      opportunityId: oppId,
      toStatus: "published",
    });
    const entryId = await submitVolunteerHours({
      actorUserId: user,
      opportunityId: oppId,
      hours: 2,
      activityDate: "2026-08-02",
      description: "Short support session for negative total protection test.",
    });
    await reviewVolunteerHours({
      actorUserId: adminId,
      entryId,
      decision: "approved",
    });
    await expect(
      adjustVolunteerHours({
        actorUserId: adminId,
        entryId,
        deltaHours: -5,
        reason: "Attempt to drive total below zero should fail transactionally.",
      }),
    ).rejects.toBeInstanceOf(VolunteerError);
  });
});
