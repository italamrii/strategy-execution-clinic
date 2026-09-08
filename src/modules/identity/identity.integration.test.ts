import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import EmbeddedPostgres from "@/shared/testing/embedded-postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { v7 as uuidv7 } from "uuid";
import { clearMemoryInbox, getLatestOtpForEmail } from "@/shared/ports/email";
import { closeDb, getDb, resetDb } from "@/shared/db/client";
import {
  auditLogs,
  authOtpChallenges,
  profiles,
  roles,
  userRoles,
  users,
} from "@/shared/db/schema";
import {
  AuthError,
  assignRole,
  buildActor,
  createSession,
  getPrivateAccount,
  publicProfileLeaksPrivate,
  requestLoginOtp,
  requirePermission,
  resolveSessionByToken,
  revokeAllSessionsForUser,
  revokeSession,
  seedRbacCatalog,
  toPublicProfileDto,
  updateLocale,
  verifyLoginOtp,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { RateLimitError } from "@/modules/identity/rate-limit";
import { OTP_EMAIL_LIMIT_PER_HOUR } from "@/modules/identity/constants";

const PORT = 55400 + ((process.pid + 1) % 800);
const DATA_DIR = path.resolve(process.cwd(), ".data", `pg-identity-test-${process.pid}`);

describe("identity integration", () => {
  let pg: EmbeddedPostgres;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-phase1";
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
  }, 120_000);

  afterAll(async () => {
    await closeDb();
    await pg?.stop();
  });

  it("enforces OTP one-time use, expiry, and mismatch", async () => {
    clearMemoryInbox();
    const email = `otp-${Date.now()}@clinic.test`;
    await requestLoginOtp({ email, locale: "ar", ip: "127.0.0.1" });
    const code = getLatestOtpForEmail(email)!;

    const login = await verifyLoginOtp({ email, code, ip: "127.0.0.1" });
    expect(await resolveSessionByToken(login.token)).not.toBeNull();
    await expect(verifyLoginOtp({ email, code, ip: "127.0.0.1" })).rejects.toBeInstanceOf(
      AuthError,
    );

    const db = getDb();
    const firstChallenge = await db.query.authOtpChallenges.findFirst({
      where: eq(authOtpChallenges.email, email),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });
    await db
      .update(authOtpChallenges)
      .set({ createdAt: new Date(Date.now() - 120_000) })
      .where(eq(authOtpChallenges.id, firstChallenge!.id));

    clearMemoryInbox();
    await requestLoginOtp({ email, locale: "ar", ip: "127.0.0.1" });
    const nextCode = getLatestOtpForEmail(email)!;
    const challenge = await db.query.authOtpChallenges.findFirst({
      where: eq(authOtpChallenges.email, email),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });
    await db
      .update(authOtpChallenges)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(authOtpChallenges.id, challenge!.id));
    await expect(
      verifyLoginOtp({ email, code: nextCode, ip: "127.0.0.1" }),
    ).rejects.toBeInstanceOf(AuthError);

    await db
      .update(authOtpChallenges)
      .set({ createdAt: new Date(Date.now() - 120_000) })
      .where(eq(authOtpChallenges.id, challenge!.id));
    clearMemoryInbox();
    await requestLoginOtp({ email, locale: "ar", ip: "10.1.1.1" });
    await expect(
      verifyLoginOtp({ email, code: "000000", ip: "10.1.1.1" }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("rotates sessions and supports logout / logout-all", async () => {
    clearMemoryInbox();
    const email = `session-${Date.now()}@clinic.test`;
    await requestLoginOtp({ email, locale: "en", ip: "127.0.0.1" });
    const code = getLatestOtpForEmail(email)!;
    const login = await verifyLoginOtp({ email, code, ip: "127.0.0.1" });

    const rotated = await createSession({
      userId: login.userId,
      rotatedFrom: login.sessionId,
    });
    expect(rotated.session.id).not.toBe(login.sessionId);

    await revokeSession({
      sessionId: rotated.session.id,
      actorUserId: login.userId,
    });
    expect(await resolveSessionByToken(rotated.token)).toBeNull();

    const second = await createSession({ userId: login.userId });
    const third = await createSession({ userId: login.userId });
    await revokeAllSessionsForUser({
      userId: login.userId,
      actorUserId: login.userId,
    });
    expect(await resolveSessionByToken(second.token)).toBeNull();
    expect(await resolveSessionByToken(third.token)).toBeNull();
  });

  it("blocks privilege escalation and enforces RBAC + audit", async () => {
    clearMemoryInbox();
    const memberEmail = `member-${Date.now()}@clinic.test`;
    const adminEmail = `admin-${Date.now()}@clinic.test`;

    await requestLoginOtp({ email: memberEmail, locale: "ar", ip: "127.0.0.1" });
    const memberLogin = await verifyLoginOtp({
      email: memberEmail,
      code: getLatestOtpForEmail(memberEmail)!,
      ip: "127.0.0.1",
    });
    const memberActor = await buildActor(memberLogin.userId);
    expect(memberActor.permissions.includes("admin.dashboard.read")).toBe(false);
    await expect(
      requirePermission(memberLogin.userId, "admin.dashboard.read"),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      assignRole({
        actorUserId: memberLogin.userId,
        targetUserId: memberLogin.userId,
        roleSlug: "super_admin",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await requestLoginOtp({ email: adminEmail, locale: "ar", ip: "127.0.0.1" });
    const adminLogin = await verifyLoginOtp({
      email: adminEmail,
      code: getLatestOtpForEmail(adminEmail)!,
      ip: "127.0.0.1",
    });
    const db = getDb();
    const superRole = await db.query.roles.findFirst({
      where: eq(roles.slug, "super_admin"),
    });
    await db.insert(userRoles).values({
      id: uuidv7(),
      userId: adminLogin.userId,
      roleId: superRole!.id,
      organizationId: null,
      grantedBy: adminLogin.userId,
    });
    await requirePermission(adminLogin.userId, "admin.dashboard.read");
    await assignRole({
      actorUserId: adminLogin.userId,
      targetUserId: memberLogin.userId,
      roleSlug: "auditor",
    });
    const roleAudits = await db.query.auditLogs.findMany({
      where: eq(auditLogs.action, "ROLE_ASSIGNED"),
    });
    expect(roleAudits.some((row) => row.resourceId === memberLogin.userId)).toBe(true);
  });

  it("persists locale and keeps public profile DTO private", async () => {
    clearMemoryInbox();
    const email = `profile-${Date.now()}@clinic.test`;
    await requestLoginOtp({ email, locale: "ar", ip: "127.0.0.1" });
    const login = await verifyLoginOtp({
      email,
      code: getLatestOtpForEmail(email)!,
      ip: "127.0.0.1",
    });
    await updateLocale({ userId: login.userId, locale: "en" });
    const account = await getPrivateAccount(login.userId);
    expect(account?.locale).toBe("en");
    expect(account?.email).toBe(email);

    const db = getDb();
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, login.userId),
    });
    const dto = toPublicProfileDto({ profile: profile! });
    expect(publicProfileLeaksPrivate(dto)).toBe(false);
    expect(JSON.stringify(dto)).not.toContain(email);
  });

  it("rejects suspended accounts and rate-limits OTP requests", async () => {
    clearMemoryInbox();
    const email = `suspend-${Date.now()}@clinic.test`;
    await requestLoginOtp({ email, locale: "ar", ip: "127.0.0.1" });
    const login = await verifyLoginOtp({
      email,
      code: getLatestOtpForEmail(email)!,
      ip: "127.0.0.1",
    });
    const db = getDb();
    await db
      .update(users)
      .set({ status: "suspended", suspendedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, login.userId));
    await expect(
      requirePermission(login.userId, "membership.type.read"),
    ).rejects.toBeInstanceOf(AuthorizationError);

    const limited = `limit-${Date.now()}@clinic.test`;
    for (let i = 0; i < OTP_EMAIL_LIMIT_PER_HOUR; i += 1) {
      clearMemoryInbox();
      await requestLoginOtp({
        email: limited,
        locale: "ar",
        ip: `203.0.113.${i + 1}`,
      });
      // consume cooldown by aging the challenge
      const challenge = await db.query.authOtpChallenges.findFirst({
        where: eq(authOtpChallenges.email, limited),
        orderBy: (fields, { desc }) => [desc(fields.createdAt)],
      });
      await db
        .update(authOtpChallenges)
        .set({ createdAt: new Date(Date.now() - 120_000) })
        .where(eq(authOtpChallenges.id, challenge!.id));
    }
    await expect(
      requestLoginOtp({ email: limited, locale: "ar", ip: "198.51.100.1" }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
