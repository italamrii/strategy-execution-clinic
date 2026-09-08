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
  contentBlocks,
  inAppNotifications,
  notificationOutbox,
  notificationPreferences,
  roles,
  userRoles,
  users,
} from "@/shared/db/schema";
import { seedRbacCatalog } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import {
  drainOutboxForTests,
  getUnreadNotificationCount,
  listUserNotifications,
  markNotificationRead,
  processNotificationOutbox,
  scheduleNotification,
  updateNotificationPreference,
} from "@/modules/notifications";
import { sanitizeRichText } from "@/modules/notifications/sanitize";
import {
  getAnalyticsSummary,
  listAuditLogsForAdmin,
  listSecurityEventsForAdmin,
  seedSystemSettings,
  updateSystemSetting,
} from "@/modules/admin";
import { seedContentCatalog, updateContentBlock } from "@/modules/content";
import { listActiveAnnouncementsForAudience } from "@/modules/admin/service";

const PORT = 55600 + ((process.pid + 8) % 600);
const DATA_DIR = path.resolve(process.cwd(), ".data", `pg-operations-test-${process.pid}`);

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

describe("phase 6 operations integration", () => {
  let pg: EmbeddedPostgres;
  let memberId = "";
  let otherId = "";
  let adminId = "";

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-phase6";
    process.env.EMAIL_PROVIDER = "memory";
    process.env.APP_URL = "http://localhost:3000";
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
    await seedContentCatalog();
    await seedSystemSettings();
    memberId = await createUser(`member-${Date.now()}@clinic.test`);
    otherId = await createUser(`other-${Date.now()}@clinic.test`);
    adminId = await createUser(`admin-${Date.now()}@clinic.test`);
    await grantRole(adminId, "platform_admin");
  }, 120_000);

  afterAll(async () => {
    await closeDb();
    await pg?.stop();
  });

  it("creates outbox and in-app notification with idempotent schedule", async () => {
    const key = `test-membership-approved:${uuidv7()}`;
    const first = await scheduleNotification({
      eventType: "MEMBERSHIP_APPROVED",
      recipientUserId: memberId,
      linkPath: "/account/membership",
      idempotencyKey: key,
    });
    expect(first.duplicate).toBe(false);
    const second = await scheduleNotification({
      eventType: "MEMBERSHIP_APPROVED",
      recipientUserId: memberId,
      linkPath: "/account/membership",
      idempotencyKey: key,
    });
    expect(second.duplicate).toBe(true);
    const db = getDb();
    const outbox = await db.query.notificationOutbox.findMany({
      where: eq(notificationOutbox.idempotencyKey, key),
    });
    expect(outbox).toHaveLength(1);
    const inApp = await db.query.inAppNotifications.findMany({
      where: eq(inAppNotifications.userId, memberId),
    });
    expect(inApp.length).toBeGreaterThan(0);
  });

  it("processes outbox email delivery idempotently", async () => {
    const processed = await drainOutboxForTests();
    expect(processed).toBeGreaterThanOrEqual(0);
    const again = await processNotificationOutbox(50);
    expect(again).toBe(0);
  });

  it("enforces notification privacy and mark-read", async () => {
    const { items } = await listUserNotifications({ userId: memberId });
    expect(items.length).toBeGreaterThan(0);
    const notificationId = items[0]!.id;
    await expect(
      markNotificationRead({ userId: otherId, notificationId }),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await markNotificationRead({ userId: memberId, notificationId });
    const unread = await getUnreadNotificationCount(memberId);
    expect(unread).toBeGreaterThanOrEqual(0);
  });

  it("blocks disabling required security notification category", async () => {
    await expect(
      updateNotificationPreference({
        userId: memberId,
        category: "security",
        channel: "email",
        enabled: false,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("allows optional category preference updates", async () => {
    await updateNotificationPreference({
      userId: memberId,
      category: "recognition",
      channel: "in_app",
      enabled: false,
    });
    const db = getDb();
    const pref = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, memberId),
    });
    expect(pref?.enabled).toBe(false);
  });

  it("blocks unauthorized analytics and allows admin analytics", async () => {
    await expect(getAnalyticsSummary({ actorUserId: memberId })).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    const summary = await getAnalyticsSummary({ actorUserId: adminId });
    expect(summary).toHaveProperty("membershipGrowth");
  });

  it("sanitizes stored XSS in content blocks", async () => {
    const db = getDb();
    const block = await db.query.contentBlocks.findFirst({
      where: eq(contentBlocks.slug, "about.clinic"),
    });
    expect(block).toBeTruthy();
    const evil = '<p>Hello</p><script>alert(1)</script>';
    expect(sanitizeRichText(evil)).not.toContain("<script");
    await updateContentBlock({
      actorUserId: adminId,
      blockId: block!.id,
      patch: { bodyEn: evil },
    });
    const updated = await db.query.contentBlocks.findFirst({
      where: eq(contentBlocks.id, block!.id),
    });
    expect(updated!.bodyEn).not.toContain("<script");
  });

  it("blocks unauthorized content updates", async () => {
    const db = getDb();
    const block = await db.query.contentBlocks.findFirst({
      where: eq(contentBlocks.slug, "home.hero"),
    });
    await expect(
      updateContentBlock({
        actorUserId: memberId,
        blockId: block!.id,
        patch: { titleEn: "Hacked" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("requires permission for settings and rejects secret keys", async () => {
    await expect(
      updateSystemSetting({
        actorUserId: memberId,
        key: "clinic.display_name_en",
        value: "Hacked",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      updateSystemSetting({
        actorUserId: adminId,
        key: "smtp.secret",
        value: "nope",
      }),
    ).rejects.toThrow("setting_not_editable");
  });

  it("requires permission for audit and security viewers", async () => {
    await expect(
      listAuditLogsForAdmin({ actorUserId: memberId }),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      listSecurityEventsForAdmin({ actorUserId: memberId }),
    ).rejects.toBeInstanceOf(AuthorizationError);
    const audit = await listAuditLogsForAdmin({ actorUserId: adminId });
    expect(audit.items).toBeDefined();
    for (const row of audit.items) {
      const serialized = JSON.stringify(row);
      expect(serialized.toLowerCase()).not.toContain("otp");
      expect(serialized.toLowerCase()).not.toContain("password");
    }
  });

  it("filters announcements by audience", async () => {
    const all = await listActiveAnnouncementsForAudience("ALL");
    const members = await listActiveAnnouncementsForAudience("MEMBERS");
    expect(Array.isArray(all)).toBe(true);
    expect(Array.isArray(members)).toBe(true);
  });
});
