import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import EmbeddedPostgres from "@/shared/testing/embedded-postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { v7 as uuidv7 } from "uuid";
import { closeDb, getDb, resetDb } from "@/shared/db/client";
import {
  impactEvents,
  profiles,
  roles,
  trackContributions,
  trackLeadershipAssignments,
  trackMemberships,
  userRoles,
  users,
  volunteerHourEntries,
} from "@/shared/db/schema";
import { seedRbacCatalog } from "@/modules/identity";
import { issueMembershipDirectly, seedMembershipCatalog } from "@/modules/membership";
import { AuthorizationError } from "@/shared/security/authorization";
import {
  applyToTrack,
  appointTrackLeader,
  assignTrackMember,
  createTrackContribution,
  getVerifiedTrackIdentity,
  reviewTrackApplication,
  reviewTrackContribution,
  seedTracksOperatingCatalog,
  suspendTrackPrivilegesForUser,
} from "@/modules/tracks";
import { TrackError } from "@/modules/tracks/errors";

const PORT = 55480 + ((process.pid + 7) % 700);
const DATA_DIR = path.resolve(process.cwd(), ".data", `pg-tracks-test-${process.pid}`);

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
  await db.insert(profiles).values({
    id: uuidv7(),
    userId: id,
    displayNameAr: email.split("@")[0]!,
    displayNameEn: email.split("@")[0]!,
    visibility: "members",
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

describe("tracks operating model integration", () => {
  let pg: EmbeddedPostgres;
  let adminId = "";
  let memberId = "";
  let leaderId = "";
  let strategyTrackId = "";
  let professionalTypeId = "";

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-tracks";
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
    await seedTracksOperatingCatalog();
    await seedTracksOperatingCatalog();

    const db = getDb();
    const trackRows = await db.query.tracks.findMany();
    expect(trackRows).toHaveLength(8);
    strategyTrackId = trackRows.find((t) => t.slug === "strategy")!.id;
    professionalTypeId = (await db.query.membershipTypes.findMany()).find(
      (t) => t.slug === "professional_member",
    )!.id;

    adminId = await createUser("tracks-admin@example.com");
    memberId = await createUser("tracks-member@example.com");
    leaderId = await createUser("tracks-leader@example.com");
    await grantRole(adminId, "platform_admin");
    await grantRole(leaderId, "track_lead");
    await grantRole(leaderId, "member");
    await grantRole(memberId, "member");

    await issueMembershipDirectly({
      actorUserId: adminId,
      targetUserId: memberId,
      membershipTypeId: professionalTypeId,
      trackIds: [strategyTrackId],
      reason: "Tracks integration fixture",
    });
    await issueMembershipDirectly({
      actorUserId: adminId,
      targetUserId: leaderId,
      membershipTypeId: professionalTypeId,
      trackIds: [strategyTrackId],
      reason: "Tracks leader fixture",
    });
  }, 180_000);

  afterAll(async () => {
    await closeDb();
    try {
      await pg?.stop();
    } catch {
      // ignore
    }
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it("requires application approval before track membership (unless admin assigns)", async () => {
    const application = await applyToTrack({
      actorUserId: memberId,
      trackId: strategyTrackId,
      wantPrimary: true,
      motivation: "Contribute to strategy diagnosis",
    });
    await expect(
      createTrackContribution({
        actorUserId: memberId,
        trackId: strategyTrackId,
        contributionType: "article",
        titleAr: "مقال",
        titleEn: "Article",
        submit: true,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await reviewTrackApplication({
      actorUserId: adminId,
      applicationId: application.id,
      decision: "approved",
    });

    const membership = await getDb().query.trackMemberships.findFirst({
      where: and(
        eq(trackMemberships.userId, memberId),
        eq(trackMemberships.trackId, strategyTrackId),
        eq(trackMemberships.status, "active"),
      ),
    });
    expect(membership?.isPrimary).toBe(true);
  });

  it("keeps a single active primary leader and exposes verified track identity", async () => {
    await assignTrackMember({
      actorUserId: adminId,
      trackId: strategyTrackId,
      userId: leaderId,
      role: "member",
      isPrimary: true,
    });
    await appointTrackLeader({
      actorUserId: adminId,
      trackId: strategyTrackId,
      userId: leaderId,
      leadershipRole: "primary",
    });
    await appointTrackLeader({
      actorUserId: adminId,
      trackId: strategyTrackId,
      userId: memberId,
      leadershipRole: "primary",
    });

    const leadership = await getDb().query.trackLeadershipAssignments.findMany({
      where: and(
        eq(trackLeadershipAssignments.trackId, strategyTrackId),
        eq(trackLeadershipAssignments.status, "active"),
        eq(trackLeadershipAssignments.leadershipRole, "primary"),
      ),
    });
    expect(leadership).toHaveLength(1);
    expect(leadership[0]?.userId).toBe(memberId);

    const leaderIdentity = await getVerifiedTrackIdentity(leaderId);
    expect(leaderIdentity.isGroupLeader).toBe(false);

    await appointTrackLeader({
      actorUserId: adminId,
      trackId: strategyTrackId,
      userId: leaderId,
      leadershipRole: "primary",
    });
    const restored = await getVerifiedTrackIdentity(leaderId);
    expect(restored.isGroupLeader).toBe(true);
    expect(restored.primaryTrack?.slug).toBe("strategy");
  });

  it("blocks leaders from approving their own contributions and protects duplicate rewards", async () => {
    const own = await createTrackContribution({
      actorUserId: leaderId,
      trackId: strategyTrackId,
      contributionType: "volunteer_task",
      titleAr: "مهمة",
      titleEn: "Task",
      hoursClaimed: 3,
      submit: true,
    });
    await expect(
      reviewTrackContribution({
        actorUserId: leaderId,
        contributionId: own.id,
        decision: "under_review",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await reviewTrackContribution({
      actorUserId: adminId,
      contributionId: own.id,
      decision: "under_review",
    });
    await reviewTrackContribution({
      actorUserId: adminId,
      contributionId: own.id,
      decision: "approved",
      hoursAwarded: 3,
    });
    await reviewTrackContribution({
      actorUserId: adminId,
      contributionId: own.id,
      decision: "published",
    });
    await reviewTrackContribution({
      actorUserId: adminId,
      contributionId: own.id,
      decision: "completed",
    });

    const contribution = await getDb().query.trackContributions.findFirst({
      where: eq(trackContributions.id, own.id),
    });
    expect(contribution?.impactAwarded).toBe(true);
    expect(Number(contribution?.hoursAwarded)).toBe(3);

    const impacts = await getDb().query.impactEvents.findMany({
      where: and(
        eq(impactEvents.sourceTable, "track_contributions"),
        eq(impactEvents.sourceId, own.id),
      ),
    });
    expect(impacts).toHaveLength(1);

    const hours = await getDb().query.volunteerHourEntries.findMany({
      where: and(
        eq(volunteerHourEntries.userId, leaderId),
        eq(volunteerHourEntries.source, `track_contribution:${own.id}`),
      ),
    });
    expect(hours).toHaveLength(1);
  });

  it("suspends track privileges when membership privileges are revoked", async () => {
    await suspendTrackPrivilegesForUser({
      userId: memberId,
      reason: "membership_suspended",
    });
    const memberships = await getDb().query.trackMemberships.findMany({
      where: and(eq(trackMemberships.userId, memberId), eq(trackMemberships.status, "active")),
    });
    expect(memberships).toHaveLength(0);
    const identity = await getVerifiedTrackIdentity(memberId);
    expect(identity.primaryTrack).toBeNull();
    expect(identity.isGroupLeader).toBe(false);
  });

  it("rejects invalid contribution transitions", async () => {
    await assignTrackMember({
      actorUserId: adminId,
      trackId: strategyTrackId,
      userId: memberId,
      role: "member",
      isPrimary: true,
    });
    const draft = await createTrackContribution({
      actorUserId: memberId,
      trackId: strategyTrackId,
      contributionType: "article",
      titleAr: "مسودة",
      titleEn: "Draft",
      submit: false,
    });
    await expect(
      reviewTrackContribution({
        actorUserId: adminId,
        contributionId: draft.id,
        decision: "approved",
      }),
    ).rejects.toBeInstanceOf(TrackError);
  });
});
