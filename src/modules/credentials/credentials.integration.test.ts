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
import { credentials, membershipTypes, users, userRoles, roles } from "@/shared/db/schema";
import { seedRbacCatalog } from "@/modules/identity";
import { seedMembershipCatalog } from "@/modules/membership";
import {
  adminRevokeCredential,
  backfillCredentials,
  issueCredentialForMembership,
  publicDtoLeaksPrivate,
  verifyPublicCode,
} from "@/modules/credentials";
import { issueMembershipDirectly } from "@/modules/membership";

const PORT = 55400 + ((process.pid + 3) % 800);
const DATA_DIR = path.resolve(process.cwd(), ".data", `pg-credentials-test-${process.pid}`);

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

describe("credentials integration", () => {
  let pg: EmbeddedPostgres;
  let professionalTypeId = "";

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-phase3";
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
    await migrate(drizzle(sql), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
    await sql.end({ timeout: 5 });
    await resetDb(url);
    await seedRbacCatalog();
    await seedMembershipCatalog();
    professionalTypeId = (
      await getDb().query.membershipTypes.findFirst({
        where: eq(membershipTypes.slug, "professional_member"),
      })
    )!.id;
  }, 120_000);

  afterAll(async () => {
    await closeDb();
    await pg?.stop();
  });

  it("issues one idempotent credential for an active membership", async () => {
    const member = await createUser(`cred-${Date.now()}@clinic.test`);
    const admin = await createUser(`cred-admin-${Date.now()}@clinic.test`);
    const db = getDb();
    const role = await db.query.roles.findFirst({ where: eq(roles.slug, "membership_admin") });
    await db.insert(userRoles).values({
      id: uuidv7(),
      userId: admin,
      roleId: role!.id,
      organizationId: null,
      grantedBy: null,
    });
    const membershipId = await issueMembershipDirectly({
      actorUserId: admin,
      targetUserId: member,
      membershipTypeId: professionalTypeId,
      trackIds: [],
      reason: "Credential integration fixture",
    });
    const rows = await db.query.credentials.findMany({
      where: eq(credentials.membershipId, membershipId),
    });
    expect(rows).toHaveLength(1);
    const again = await issueCredentialForMembership({
      membershipId,
      issuanceSource: "retry",
    });
    expect(again).toBe(rows[0]!.id);
  });

  it("backfills idempotently and verifies public DTO boundaries", async () => {
    const first = await backfillCredentials({ dryRun: false });
    const second = await backfillCredentials({ dryRun: false });
    expect(second.skipped).toBeGreaterThanOrEqual(first.issued);

    const db = getDb();
    const row = await db.query.credentials.findFirst();
    expect(row).toBeTruthy();
    const dto = await verifyPublicCode({
      publicCode: row!.publicCode,
      locale: "ar",
      ip: "127.0.0.1",
    });
    expect(dto).toBeTruthy();
    expect(publicDtoLeaksPrivate(dto!)).toBe(false);
    expect(dto!.publicCode).toBe(row!.publicCode.toUpperCase());
  });

  it("shows revoked verification immediately after admin revoke", async () => {
    const db = getDb();
    const row = await db.query.credentials.findFirst({
      where: eq(credentials.status, "active"),
    });
    expect(row).toBeTruthy();
    const admin = await createUser(`revoke-admin-${Date.now()}@clinic.test`);
    const role = await db.query.roles.findFirst({ where: eq(roles.slug, "membership_admin") });
    await db.insert(userRoles).values({
      id: uuidv7(),
      userId: admin,
      roleId: role!.id,
      organizationId: null,
      grantedBy: null,
    });
    await adminRevokeCredential({
      actorUserId: admin,
      credentialId: row!.id,
      reason: "Policy violation in integration test",
    });
    const dto = await verifyPublicCode({
      publicCode: row!.publicCode,
      locale: "en",
      ip: "127.0.0.2",
    });
    expect(dto?.status).toBe("REVOKED");
    expect(dto?.verified).toBe(false);
  });

  it("returns null for unknown codes without leaking internals", async () => {
    const dto = await verifyPublicCode({
      publicCode: "SEC-PRO-2026-ZZZZZZ",
      locale: "en",
      ip: "127.0.0.3",
    });
    expect(dto).toBeNull();
  });

  it("shows suspended verification when membership is suspended", async () => {
    const member = await createUser(`suspend-member-${Date.now()}@clinic.test`);
    const admin = await createUser(`suspend-admin-${Date.now()}@clinic.test`);
    const db = getDb();
    const role = await db.query.roles.findFirst({ where: eq(roles.slug, "membership_admin") });
    await db.insert(userRoles).values({
      id: uuidv7(),
      userId: admin,
      roleId: role!.id,
      organizationId: null,
      grantedBy: null,
    });
    const membershipId = await issueMembershipDirectly({
      actorUserId: admin,
      targetUserId: member,
      membershipTypeId: professionalTypeId,
      trackIds: [],
      reason: "Suspend verification fixture",
    });
    const row = await db.query.credentials.findFirst({
      where: eq(credentials.membershipId, membershipId),
    });
    expect(row).toBeTruthy();
    const { suspendMembership } = await import("@/modules/membership");
    await suspendMembership({
      actorUserId: admin,
      membershipId,
      reason: "Policy hold in integration test",
    });
    const dto = await verifyPublicCode({
      publicCode: row!.publicCode,
      locale: "ar",
      ip: "127.0.0.4",
    });
    expect(dto?.status).toBe("SUSPENDED");
    expect(dto?.verified).toBe(false);
  });
});
