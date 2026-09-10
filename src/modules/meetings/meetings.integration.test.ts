import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import EmbeddedPostgres from "@/shared/testing/embedded-postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { v7 as uuidv7 } from "uuid";
import { closeDb, getDb, resetDb } from "@/shared/db/client";
import { consultationRequests, profiles, roles, userRoles, users } from "@/shared/db/schema";
import { seedRbacCatalog } from "@/modules/identity";
import { createConsultation } from "@/modules/consultations";
import { createMeeting, getMeetingForUser, MeetingError } from "@/modules/meetings";

const PORT = 55540 + ((process.pid + 13) % 600);
const DATA_DIR = path.resolve(process.cwd(), ".data", `pg-meetings-test-${process.pid}`);

function clearJitsiEnv() {
  delete process.env.JITSI_DOMAIN;
  delete process.env.JITSI_JWT_APP_ID;
  delete process.env.JITSI_JWT_SECRET;
  delete process.env.JITSI_JWT_ISSUER;
}

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

describe("meetings access integration", () => {
  let pg: EmbeddedPostgres;
  let expertId = "";
  let memberId = "";
  let strangerId = "";
  let adminId = "";

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-meetings";
    process.env.EMAIL_PROVIDER = "memory";
    process.env.APP_URL = "http://localhost:3000";
    clearJitsiEnv();
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

    expertId = await createUser("meetings-expert@example.com");
    memberId = await createUser("meetings-member@example.com");
    strangerId = await createUser("meetings-stranger@example.com");
    adminId = await createUser("meetings-admin@example.com");
    await grantRole(expertId, "expert");
    await grantRole(memberId, "member");
    await grantRole(strangerId, "member");
    await grantRole(adminId, "platform_admin");
  }, 180_000);

  afterEach(clearJitsiEnv);

  afterAll(async () => {
    clearJitsiEnv();
    await closeDb();
    try {
      await pg?.stop();
    } catch {
      // ignore shutdown races
    }
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it("stores consultation meetings but withholds join URLs until a private JWT host is configured", async () => {
    const consultation = await createConsultation({
      actorUserId: memberId,
      subject: "Private advisory session",
      description: "Need a confidential working session on execution sequencing.",
    });
    await getDb()
      .update(consultationRequests)
      .set({ assignedExpertUserId: expertId, status: "assigned", updatedAt: new Date() })
      .where(eq(consultationRequests.id, consultation.id));

    const created = await createMeeting({
      actorUserId: expertId,
      consultationId: consultation.id,
      title: "Confidential advisory room",
      startsAt: new Date(Date.now() + 60_000),
    });

    const forExpert = await getMeetingForUser(expertId, created.id);
    expect(forExpert.embedUrl).toBeNull();
    expect(forExpert.setupRequired).toBe(true);
    expect(forExpert.missingProviderConfig.length).toBeGreaterThan(0);
    expect(forExpert.embedUrl ?? "").not.toContain("meet.jit.si");
    expect(String(forExpert.roomKey)).not.toContain("meet.jit.si");

    const forMember = await getMeetingForUser(memberId, created.id);
    expect(forMember.embedUrl).toBeNull();
    expect(forMember.setupRequired).toBe(true);

    await expect(getMeetingForUser(strangerId, created.id)).rejects.toBeInstanceOf(MeetingError);
    await expect(getMeetingForUser(strangerId, created.id)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("issues a room-scoped join URL only after private JWT setup, still denying strangers", async () => {
    process.env.JITSI_DOMAIN = "https://meet.clinic.example";
    process.env.JITSI_JWT_APP_ID = "clinic";
    process.env.JITSI_JWT_SECRET = "super-secret";

    const created = await createMeeting({
      actorUserId: adminId,
      title: "Configured private room",
      startsAt: new Date(Date.now() + 120_000),
    });
    const forHost = await getMeetingForUser(adminId, created.id);
    expect(forHost.setupRequired).toBe(false);
    expect(forHost.embedUrl).toMatch(/^https:\/\/meet\.clinic\.example\//);
    expect(forHost.embedUrl).toContain("jwt=");
    expect(forHost.embedUrl).not.toContain("meet.jit.si");
    const jwt = new URLSearchParams(forHost.embedUrl!.split("#")[1]).get("jwt");
    const payload = JSON.parse(Buffer.from(jwt!.split(".")[1]!, "base64url").toString("utf8")) as {
      room: string;
    };
    expect(payload.room).toBe(forHost.roomKey);

    await expect(getMeetingForUser(strangerId, created.id)).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
