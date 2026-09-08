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
  auditLogs,
  memberships,
  membershipStatusHistory,
  membershipTypes,
  users,
} from "@/shared/db/schema";
import { seedRbacCatalog } from "@/modules/identity";
import {
  approveApplication,
  assertEligibleMembershipType,
  createApplication,
  getOwnApplicationDto,
  issueMembershipDirectly,
  listOwnMemberships,
  rejectApplication,
  requestChanges,
  revokeMembership,
  seedMembershipCatalog,
  startReview,
  submitOwnApplication,
  suspendMembership,
  updateOwnApplication,
} from "@/modules/membership";
import { MembershipError } from "@/modules/membership/errors";
import { AuthorizationError } from "@/shared/security/authorization";

const PORT = 55400 + ((process.pid + 2) % 800);
const DATA_DIR = path.resolve(process.cwd(), ".data", `pg-membership-test-${process.pid}`);

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

describe("membership integration", () => {
  let pg: EmbeddedPostgres;
  let professionalTypeId = "";
  let foundingTypeId = "";
  let strategyTrackId = "";
  let executionTrackId = "";

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-phase2";
    process.env.EMAIL_PROVIDER = "memory";
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
      // already exists
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
    await seedMembershipCatalog();

    const db = getDb();
    const typeRows = await db.query.membershipTypes.findMany();
    expect(typeRows).toHaveLength(9);
    professionalTypeId = typeRows.find((t) => t.slug === "professional_member")!.id;
    foundingTypeId = typeRows.find((t) => t.slug === "founding_member")!.id;
    const trackRows = await db.query.tracks.findMany();
    expect(trackRows).toHaveLength(8);
    strategyTrackId = trackRows.find((t) => t.slug === "strategy")!.id;
    executionTrackId = trackRows.find((t) => t.slug === "execution")!.id;
  }, 120_000);

  afterAll(async () => {
    await closeDb();
    await pg?.stop();
  });

  it("lets an eligible user create and submit an application", async () => {
    const userId = await createUser(`member-${Date.now()}@clinic.test`);
    const applicationId = await createApplication({
      actorUserId: userId,
      submit: true,
      data: {
        membershipTypeId: professionalTypeId,
        trackIds: [strategyTrackId],
        headline: "Strategy practitioner",
        summary: "Ten years in institutional strategy work.",
        motivation: "I want to contribute to the Clinic community.",
        experience: "Led transformation programs across public sector.",
      },
    });
    const dto = await getOwnApplicationDto({ actorUserId: userId, applicationId });
    expect(dto.status).toBe("submitted");
    expect(dto).not.toHaveProperty("internalNotes");
  });

  it("blocks inactive and invitation-only self application", async () => {
    const userId = await createUser(`blocked-${Date.now()}@clinic.test`);
    const db = getDb();
    const inactive = await db.query.membershipTypes.findFirst({
      where: eq(membershipTypes.slug, "expert_member"),
    });
    await db
      .update(membershipTypes)
      .set({ isEnabled: false })
      .where(eq(membershipTypes.id, inactive!.id));

    await expect(
      assertEligibleMembershipType(inactive!.id),
    ).rejects.toBeInstanceOf(MembershipError);

    await expect(
      createApplication({
        actorUserId: userId,
        data: {
          membershipTypeId: foundingTypeId,
          trackIds: [],
          headline: "Founder aspirant",
          summary: "Trying to bypass invitation only controls here.",
          motivation: "Should fail because founding is invitation only.",
          experience: "Experience that should never create a founding application.",
        },
      }),
    ).rejects.toMatchObject({ code: "invitation_only" });

    await db
      .update(membershipTypes)
      .set({ isEnabled: true })
      .where(eq(membershipTypes.id, inactive!.id));
  });

  it("enforces IDOR on application reads", async () => {
    const owner = await createUser(`owner-${Date.now()}@clinic.test`);
    const other = await createUser(`other-${Date.now()}@clinic.test`);
    const applicationId = await createApplication({
      actorUserId: owner,
      submit: true,
      data: {
        membershipTypeId: professionalTypeId,
        trackIds: [executionTrackId],
        headline: "Owner application",
        summary: "Private application content must stay private.",
        motivation: "Joining for professional reasons and peer review.",
        experience: "Delivery leadership across multiple large programs.",
      },
    });
    await expect(
      getOwnApplicationDto({ actorUserId: other, applicationId }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("blocks self-approval and unauthorized review", async () => {
    const applicant = await createUser(`self-${Date.now()}@clinic.test`);
    const stranger = await createUser(`stranger-${Date.now()}@clinic.test`);
    const otherAdmin = await createUser(`other-admin-${Date.now()}@clinic.test`);
    const { userRoles, roles } = await import("@/shared/db/schema");
    const db = getDb();

    const applicationId = await createApplication({
      actorUserId: applicant,
      submit: true,
      data: {
        membershipTypeId: professionalTypeId,
        trackIds: [strategyTrackId],
        headline: "Admin applicant",
        summary: "Should not be able to approve own membership application.",
        motivation: "Testing the non-negotiable self-approval invariant.",
        experience: "Senior reviewer attempting forbidden self approval path.",
      },
    });

    await expect(
      startReview({ actorUserId: stranger, applicationId }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, "membership_admin"),
    });
    for (const userId of [applicant, otherAdmin]) {
      await db.insert(userRoles).values({
        id: uuidv7(),
        userId,
        roleId: role!.id,
        organizationId: null,
        grantedBy: null,
      });
    }

    await startReview({ actorUserId: otherAdmin, applicationId });
    await expect(
      approveApplication({ actorUserId: applicant, applicationId }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("runs review, changes requested, rejection reason, and atomic approval", async () => {
    const applicant = await createUser(`flow-${Date.now()}@clinic.test`);
    const reviewer = await createUser(`reviewer-${Date.now()}@clinic.test`);
    const { userRoles, roles } = await import("@/shared/db/schema");
    const db = getDb();
    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, "membership_admin"),
    });
    await db.insert(userRoles).values({
      id: uuidv7(),
      userId: reviewer,
      roleId: role!.id,
      organizationId: null,
      grantedBy: null,
    });

    const applicationId = await createApplication({
      actorUserId: applicant,
      data: {
        membershipTypeId: professionalTypeId,
        trackIds: [strategyTrackId, executionTrackId],
        headline: "Flow applicant",
        summary: "Full review workflow covering changes and approval.",
        motivation: "Join the Clinic with clear professional contribution intent.",
        experience: "Program leadership and delivery excellence across sectors.",
      },
    });
    await submitOwnApplication({ actorUserId: applicant, applicationId });
    await startReview({ actorUserId: reviewer, applicationId });
    await requestChanges({
      actorUserId: reviewer,
      applicationId,
      reason: "Please clarify institutional experience.",
      internalNotes: "INTERNAL_ONLY_NOTE",
    });

    const memberDto = await getOwnApplicationDto({ actorUserId: applicant, applicationId });
    expect(memberDto.status).toBe("changes_requested");
    expect(JSON.stringify(memberDto)).not.toContain("INTERNAL_ONLY_NOTE");
    expect(memberDto).not.toHaveProperty("internalNotes");

    await updateOwnApplication({
      actorUserId: applicant,
      applicationId,
      data: {
        experience: "Clarified: led three ministry-level transformation programs.",
      },
    });
    await submitOwnApplication({ actorUserId: applicant, applicationId });
    await startReview({ actorUserId: reviewer, applicationId });

    await expect(
      rejectApplication({
        actorUserId: reviewer,
        applicationId,
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "reason_required" });

    const membershipId = await approveApplication({
      actorUserId: reviewer,
      applicationId,
      reason: "Strong professional fit",
      trackIds: [strategyTrackId],
    });

    const membershipRows = await db.query.memberships.findMany({
      where: eq(memberships.userId, applicant),
    });
    expect(membershipRows).toHaveLength(1);
    expect(membershipRows[0]!.id).toBe(membershipId);
    expect(membershipRows[0]!.status).toBe("active");

    const own = await listOwnMemberships(applicant);
    expect(own[0]!.tracks).toHaveLength(1);
    expect(own[0]!.tracks[0]!.id).toBe(strategyTrackId);

    // Duplicate approval must not create a second membership
    await expect(
      approveApplication({ actorUserId: reviewer, applicationId }),
    ).rejects.toBeInstanceOf(MembershipError);

    const after = await db.query.memberships.findMany({
      where: eq(memberships.userId, applicant),
    });
    expect(after).toHaveLength(1);
  });

  it("handles concurrent approvals with a single membership", async () => {
    const applicant = await createUser(`conc-${Date.now()}@clinic.test`);
    const r1 = await createUser(`r1-${Date.now()}@clinic.test`);
    const r2 = await createUser(`r2-${Date.now()}@clinic.test`);
    const { userRoles, roles } = await import("@/shared/db/schema");
    const db = getDb();
    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, "membership_admin"),
    });
    for (const userId of [r1, r2]) {
      await db.insert(userRoles).values({
        id: uuidv7(),
        userId,
        roleId: role!.id,
        organizationId: null,
        grantedBy: null,
      });
    }

    const applicationId = await createApplication({
      actorUserId: applicant,
      submit: true,
      data: {
        membershipTypeId: professionalTypeId,
        trackIds: [strategyTrackId],
        headline: "Concurrency applicant",
        summary: "Two reviewers race to approve the same application.",
        motivation: "Prove transaction safety under concurrent approval.",
        experience: "Systems that must not double-issue membership records.",
      },
    });
    await startReview({ actorUserId: r1, applicationId });

    const results = await Promise.allSettled([
      approveApplication({ actorUserId: r1, applicationId }),
      approveApplication({ actorUserId: r2, applicationId }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBe(1);
    const rows = await db.query.memberships.findMany({
      where: eq(memberships.userId, applicant),
    });
    expect(rows).toHaveLength(1);
  });

  it("blocks duplicate active same-type memberships and allows different types", async () => {
    const userId = await createUser(`dup-${Date.now()}@clinic.test`);
    const issuer = await createUser(`issuer-${Date.now()}@clinic.test`);
    const { userRoles, roles } = await import("@/shared/db/schema");
    const db = getDb();
    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, "membership_admin"),
    });
    await db.insert(userRoles).values({
      id: uuidv7(),
      userId: issuer,
      roleId: role!.id,
      organizationId: null,
      grantedBy: null,
    });

    await issueMembershipDirectly({
      actorUserId: issuer,
      targetUserId: userId,
      membershipTypeId: foundingTypeId,
      trackIds: [strategyTrackId],
      reason: "Board invitation for founding cohort",
    });
    await expect(
      issueMembershipDirectly({
        actorUserId: issuer,
        targetUserId: userId,
        membershipTypeId: foundingTypeId,
        trackIds: [],
        reason: "Duplicate founding attempt",
      }),
    ).rejects.toMatchObject({ code: "duplicate_active_membership" });

    const volunteer = await db.query.membershipTypes.findFirst({
      where: eq(membershipTypes.slug, "volunteer_member"),
    });
    await issueMembershipDirectly({
      actorUserId: issuer,
      targetUserId: userId,
      membershipTypeId: volunteer!.id,
      trackIds: [executionTrackId],
      reason: "Also recognize volunteer standing",
    });
    const rows = await db.query.memberships.findMany({
      where: eq(memberships.userId, userId),
    });
    expect(rows.filter((r) => r.status === "active")).toHaveLength(2);

    const audits = await db.query.auditLogs.findMany({
      where: eq(auditLogs.action, "MEMBERSHIP_ISSUED_DIRECTLY"),
    });
    expect(audits.length).toBeGreaterThan(0);
  });

  it("preserves suspension and revocation history", async () => {
    const userId = await createUser(`life-${Date.now()}@clinic.test`);
    const admin = await createUser(`life-admin-${Date.now()}@clinic.test`);
    const { userRoles, roles } = await import("@/shared/db/schema");
    const db = getDb();
    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, "membership_admin"),
    });
    await db.insert(userRoles).values({
      id: uuidv7(),
      userId: admin,
      roleId: role!.id,
      organizationId: null,
      grantedBy: null,
    });
    const membershipId = await issueMembershipDirectly({
      actorUserId: admin,
      targetUserId: userId,
      membershipTypeId: professionalTypeId,
      trackIds: [strategyTrackId],
      reason: "Lifecycle fixture membership",
    });
    await suspendMembership({
      actorUserId: admin,
      membershipId,
      reason: "Temporary compliance hold",
    });
    await revokeMembership({
      actorUserId: admin,
      membershipId,
      reason: "Policy violation after review",
    });
    const history = await db.query.membershipStatusHistory.findMany({
      where: eq(membershipStatusHistory.membershipId, membershipId),
    });
    expect(history.map((h) => h.toStatus)).toEqual(
      expect.arrayContaining(["active", "suspended", "revoked"]),
    );
    const row = await db.query.memberships.findFirst({
      where: eq(memberships.id, membershipId),
    });
    expect(row?.status).toBe("revoked");
  });

  it("rejects client-style status/track assignment without service APIs", async () => {
    const userId = await createUser(`tamper-${Date.now()}@clinic.test`);
    const dto = await createApplication({
      actorUserId: userId,
      submit: true,
      data: {
        membershipTypeId: professionalTypeId,
        trackIds: [strategyTrackId],
        headline: "Tamper test",
        summary: "Ensure member cannot set membership status via application DTO.",
        motivation: "Security boundary for mass assignment attempts.",
        experience: "Attempted privilege escalation must fail at service boundary.",
      },
    });
    const own = await getOwnApplicationDto({ actorUserId: userId, applicationId: dto });
    expect(own.status).toBe("submitted");
    await expect(
      issueMembershipDirectly({
        actorUserId: userId,
        targetUserId: userId,
        membershipTypeId: professionalTypeId,
        trackIds: [strategyTrackId],
        reason: "Unauthorized self issue",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
