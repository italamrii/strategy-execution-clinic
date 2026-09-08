#!/usr/bin/env tsx
/**
 * pnpm dev:local — starts embedded PostgreSQL, migrates, seeds, and runs Next.js dev.
 *
 * Requirements:
 *  - Starts embedded Postgres on port 54329 (persistent data dir .data/pg)
 *  - Runs all migrations 0000–0006
 *  - Runs all production-safe idempotent seeds
 *  - Starts Next.js dev on port 3000
 *  - Polls /api/ready until DB is confirmed up
 *  - Ctrl+C stops both Next.js and Postgres cleanly
 *  - Never sets E2E=true or ENABLE_TEST_OTP_ENDPOINT
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const ROOT = process.cwd();
const DATA_DIR = path.resolve(ROOT, ".data", "pg");
const STATE_FILE = path.resolve(ROOT, ".data", "local-pg.json");
const PORT = Number(process.env.EMBEDDED_PG_PORT ?? 54329);
const APP_PORT = 3000;
const DATABASE_URL = `postgres://clinic:clinic@127.0.0.1:${PORT}/clinic`;
const READY_URL = `http://localhost:${APP_PORT}/api/ready`;

function log(tag: string, msg: string) {
  console.log(`[dev:local ${new Date().toISOString()}] ${tag}: ${msg}`);
}

async function waitForPostgres(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    const sql = postgres(url, { max: 1, connect_timeout: 3 });
    try {
      await sql`SELECT 1`;
      await sql.end({ timeout: 3 });
      return;
    } catch (e) {
      lastError = e;
      await sql.end({ timeout: 1 }).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`PostgreSQL not ready after ${timeoutMs}ms: ${lastError}`);
}

async function runMigrationsAndSeeds(url: string): Promise<void> {
  log("migrate", "applying migrations");
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: path.resolve(ROOT, "drizzle") });
  await sql.end({ timeout: 5 });
  log("migrate", "migrations applied");

  log("seed", "running all idempotent seeds");
  // We use dynamic imports so DATABASE_URL is set before modules load their DB connections
  process.env.DATABASE_URL = url;

  const { closeDb, resetDb } = await import("../src/shared/db/client");
  await resetDb(url);

  const { seedRbacCatalog } = await import("../src/modules/identity/rbac/service");
  await seedRbacCatalog();

  const { seedMembershipCatalog } = await import("../src/modules/membership/catalog-service");
  await seedMembershipCatalog();

  const { seedVolunteerCatalog } = await import("../src/modules/volunteering/service");
  await seedVolunteerCatalog();

  const { seedRecognitionCatalog } = await import("../src/modules/recognition/service");
  await seedRecognitionCatalog();

  const { seedContentCatalog } = await import("../src/modules/content/service");
  await seedContentCatalog();

  const { seedSystemSettings } = await import("../src/modules/admin/service");
  await seedSystemSettings();

  await closeDb();
  log("seed", "all seeds complete");
}

async function verifyContentBlocks(url: string): Promise<void> {
  const sql = postgres(url, { max: 1 });
  const rows = await sql<{ slug: string }[]>`
    SELECT slug FROM content_blocks WHERE slug = 'home.hero' LIMIT 1
  `;
  await sql.end({ timeout: 3 });
  if (rows.length === 0) {
    throw new Error("content_blocks.home.hero missing after seed — check seedContentCatalog");
  }
  log("verify", `content_blocks home.hero confirmed`);
}

async function waitForReady(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(READY_URL, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const body = await res.json() as { ok?: boolean; database?: string };
        if (body.ok === true && body.database === "up") {
          return;
        }
      }
    } catch {
      // still booting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`/api/ready did not return {ok:true,database:"up"} within ${timeoutMs}ms`);
}

async function main() {
  // ── 1. Ensure .data dir exists ─────────────────────────────────────────
  await mkdir(path.resolve(ROOT, ".data"), { recursive: true });

  // ── 2. Start embedded PostgreSQL (persistent) ─────────────────────────
  log("postgres", `starting on port ${PORT} (data: ${DATA_DIR})`);
  await mkdir(DATA_DIR, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "clinic",
    password: "clinic",
    port: PORT,
    persistent: true,
  });

  try {
    await pg.initialise();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.toLowerCase().includes("already") && !msg.includes("initdb")) {
      log("postgres", `initialise warning: ${msg}`);
    }
  }

  await pg.start();

  try {
    await pg.createDatabase("clinic");
  } catch {
    // Already exists on subsequent runs
  }

  log("postgres", `waiting for PostgreSQL SELECT 1`);
  await waitForPostgres(DATABASE_URL);
  log("postgres", "SELECT 1 succeeded");

  // Save state file for other scripts that read it
  await writeFile(STATE_FILE, JSON.stringify({ url: DATABASE_URL, port: PORT, startedAt: new Date().toISOString() }, null, 2), "utf8");

  // ── 3. Migrate + seed ──────────────────────────────────────────────────
  await runMigrationsAndSeeds(DATABASE_URL);

  // ── 4. Verify content_blocks ───────────────────────────────────────────
  await verifyContentBlocks(DATABASE_URL);

  // ── 5. Start Next.js dev ───────────────────────────────────────────────
  log("next", `starting Next.js dev on http://localhost:${APP_PORT}`);

  const baseEnv = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;
  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    DATABASE_URL,
    PORT: String(APP_PORT),
    NODE_ENV: "development",
    APP_ENV: "local",
    APP_URL: `http://localhost:${APP_PORT}`,
    // Safety: never enable test-only paths in dev:local
    E2E: "false",
    ENABLE_TEST_OTP_ENDPOINT: "false",
    EMAIL_CAPTURE: "false",
    // Local-only usability. Production validation rejects these settings.
    EMAIL_PROVIDER: "console",
    AUTH_DEV_LOG_OTP: "true",
  };

  const nextProcess: ChildProcess = spawn(
    "next",
    ["dev", "-p", String(APP_PORT)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env,
      shell: true,
    },
  );

  // ── 6. Poll /api/ready ─────────────────────────────────────────────────
  log("ready", `polling ${READY_URL}`);
  try {
    await waitForReady(90_000);
  } catch (e) {
    log("ready", `FAILED: ${e}`);
    nextProcess.kill("SIGTERM");
    await pg.stop();
    process.exit(1);
  }
  log("ready", "database up confirmed");

  // ── 7. Print URLs ──────────────────────────────────────────────────────
  console.log("\n");
  console.log("══════════════════════════════════════════════");
  console.log("  Strategy & Execution Clinic — dev:local");
  console.log("══════════════════════════════════════════════");
  console.log(`  Arabic:   http://localhost:${APP_PORT}/ar`);
  console.log(`  English:  http://localhost:${APP_PORT}/en`);
  console.log(`  Admin:    http://localhost:${APP_PORT}/ar/admin`);
  console.log("  Local OTP codes are printed here after requesting sign-in.");
  console.log("  Press Ctrl+C to stop");
  console.log("══════════════════════════════════════════════");
  console.log("\n");

  // ── 8. Graceful shutdown ───────────────────────────────────────────────
  let stopping = false;

  async function shutdown(signal: string) {
    if (stopping) return;
    stopping = true;
    log("shutdown", `received ${signal}`);
    nextProcess.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 5000);
      nextProcess.once("exit", () => { clearTimeout(t); resolve(); });
    });
    log("shutdown", "Next.js stopped");
    await pg.stop();
    log("shutdown", "PostgreSQL stopped");
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  nextProcess.on("exit", (code) => {
    if (!stopping) {
      log("next", `exited unexpectedly with code ${code}`);
      void shutdown("next-exit");
    }
  });

  // Keep process alive
  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
