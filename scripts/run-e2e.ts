/**
 * Single-command E2E orchestration for Phase 3.
 *
 * Starts dedicated embedded Postgres → migrate → seed → Next.js → /api/ready
 * → Playwright → teardown. Fail-fast with bounded timeouts.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import EmbeddedPostgres from "../src/shared/testing/embedded-postgres";
import { closeDb, resetDb } from "../src/shared/db/client";
import { seedRbacCatalog } from "../src/modules/identity/rbac/service";
import { seedMembershipCatalog } from "../src/modules/membership/catalog-service";
import { seedVolunteerCatalog } from "../src/modules/volunteering/service";
import { seedRecognitionCatalog } from "../src/modules/recognition/service";
import { seedContentCatalog } from "../src/modules/content/service";
import { seedSystemSettings } from "../src/modules/admin/service";

const ROOT = process.cwd();
const E2E_PG_PORT = Number(process.env.E2E_PG_PORT ?? 0);
const E2E_APP_PORT = Number(process.env.E2E_APP_PORT ?? 3100);
const E2E_HOST = process.env.E2E_HOST ?? "localhost";
const DATA_DIR = path.resolve(ROOT, ".data", `pg-e2e-${process.pid}`);
const STATE_FILE = path.resolve(ROOT, ".data", "e2e-stack.json");
const LOG_DIR = path.resolve(ROOT, ".data", "e2e-logs");
const SCREENSHOT_DIR = path.resolve(ROOT, "e2e", "screenshots");

let resolvedPgPort = E2E_PG_PORT;

const TIMEOUTS = {
  portFree: 10_000,
  postgresStart: 120_000,
  postgresReady: 30_000,
  migrate: 60_000,
  seed: 60_000,
  appBoot: 90_000,
  readyPoll: 90_000,
  readyInterval: 1_000,
};

type StackState = {
  databaseUrl: string;
  pgPort: number;
  appPort: number;
  appBaseUrl: string;
  startedAt: string;
};

let pgInstance: EmbeddedPostgres | null = null;
let appProcess: ChildProcess | null = null;
let shuttingDown = false;

function log(step: string, message: string) {
  const stamp = new Date().toISOString();
  console.log(`[e2e ${stamp}] ${step}: ${message}`);
}

function fail(step: string, message: string, details?: unknown): never {
  console.error(`[e2e FAIL] ${step}: ${message}`);
  if (details !== undefined) {
    console.error(details);
  }
  throw new Error(`${step}: ${message}`);
}

async function withTimeout<T>(label: string, ms: number, work: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function isPortFree(port: number, host = E2E_HOST): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findFreePort(preferred: number, host = "127.0.0.1"): Promise<number> {
  if (preferred > 0 && (await isPortFree(preferred, host))) {
    return preferred;
  }
  for (let i = 0; i < 40; i += 1) {
    const candidate = 54_000 + Math.floor(Math.random() * 1_000);
    if (await isPortFree(candidate, host)) {
      return candidate;
    }
  }
  fail("port", "could not find a free PostgreSQL port");
}

async function assertPortFree(port: number, label: string, host = E2E_HOST) {
  const free = await withTimeout(`port-check:${label}`, TIMEOUTS.portFree, () =>
    isPortFree(port, host),
  );
  if (free) return;

  if (!free) {
    fail(
      "port",
      `${label} port ${port} is already in use. Stop the conflicting process and retry.`,
    );
  }
}

async function waitForSqlReady(url: string) {
  await withTimeout("postgres-ready", TIMEOUTS.postgresReady, async () => {
    const started = Date.now();
    let lastError: unknown;
    while (Date.now() - started < TIMEOUTS.postgresReady) {
      const sql = postgres(url, { max: 1, connect_timeout: 3 });
      try {
        const rows = await sql`select 1 as ok`;
        if (rows[0]?.ok === 1) {
          await sql.end({ timeout: 3 });
          return;
        }
      } catch (error) {
        lastError = error;
      } finally {
        try {
          await sql.end({ timeout: 1 });
        } catch {
          // ignore
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    fail("postgres-ready", "SELECT 1 never succeeded", lastError);
  });
}

async function startPostgres(): Promise<string> {
  resolvedPgPort = await findFreePort(E2E_PG_PORT, "127.0.0.1");
  await assertPortFree(resolvedPgPort, "postgres", "127.0.0.1");
  await mkdir(path.dirname(DATA_DIR), { recursive: true });
  await rm(DATA_DIR, { recursive: true, force: true });
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(LOG_DIR, { recursive: true });

  log("postgres", `starting embedded-postgres on ${resolvedPgPort} (dir=${DATA_DIR})`);
  pgInstance = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "clinic",
    password: "clinic",
    port: resolvedPgPort,
    persistent: false,
  });

  await withTimeout("postgres-start", TIMEOUTS.postgresStart, async () => {
    await pgInstance!.initialise();
    await pgInstance!.start();
    try {
      await pgInstance!.createDatabase("clinic_e2e");
    } catch {
      // may already exist in rare races
    }
  });

  const url = `postgres://clinic:clinic@127.0.0.1:${resolvedPgPort}/clinic_e2e`;
  await waitForSqlReady(url);
  log("postgres", `ready (SELECT 1 ok) url=${url}`);
  return url;
}

async function runMigrations(url: string) {
  log("migrate", "applying drizzle migrations");
  await withTimeout("migrate", TIMEOUTS.migrate, async () => {
    const sql = postgres(url, { max: 1 });
    try {
      await migrate(drizzle(sql), {
        migrationsFolder: path.resolve(ROOT, "drizzle"),
      });
      const applied = await sql`
        select id, hash, created_at
        from drizzle.__drizzle_migrations
        order by created_at
      `.catch(async () => {
        return sql`
          select id, hash, created_at
          from __drizzle_migrations
          order by created_at
        `;
      });
      log("migrate", `applied ${applied.length} migration(s)`);
      for (const row of applied) {
        log("migrate", `  - ${String(row.id)} ${String(row.hash).slice(0, 12)}…`);
      }
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
}

async function runSeeds(url: string) {
  log("seed", "RBAC + membership catalog");
  await withTimeout("seed", TIMEOUTS.seed, async () => {
    await resetDb(url);
    await seedRbacCatalog();
    await seedMembershipCatalog();
    await seedVolunteerCatalog();
    await seedRecognitionCatalog();
    await seedContentCatalog();
    await seedSystemSettings();
    await closeDb();
  });
  log("seed", "complete");
}

async function ensureProductionBuild() {
  if (process.env.E2E_SKIP_BUILD === "true") {
    log("build", "E2E_SKIP_BUILD=true — skipping rebuild");
    return;
  }
  log("build", "running production build for E2E (required for next start + test routes)");
  await withTimeout("build", 300_000, async () => {
    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn(
        process.platform === "win32" ? "pnpm.cmd" : "pnpm",
        ["build"],
        {
          cwd: ROOT,
          env: {
            ...process.env,
            E2E: "true",
            // Build-time DB not required for compile; avoid accidental prod URL.
            DATABASE_URL: process.env.DATABASE_URL,
          },
          stdio: "inherit",
          shell: process.platform === "win32",
        },
      );
      child.on("error", reject);
      child.on("exit", (exitCode) => resolve(exitCode ?? 1));
    });
    if (code !== 0) fail("build", `pnpm build exited with code ${code}`);
  });
}

async function startApp(databaseUrl: string): Promise<string> {
  await assertPortFree(E2E_APP_PORT, "app");
  const baseUrl = `http://${E2E_HOST}:${E2E_APP_PORT}`;
  const appLogPath = path.join(LOG_DIR, "next-app.log");
  await writeFile(appLogPath, "", "utf8");

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    E2E: "true",
    DATABASE_URL: databaseUrl,
    APP_URL: baseUrl,
    AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-auth-secret-e2e",
    EMAIL_PROVIDER: "memory",
    ENABLE_TEST_OTP_ENDPOINT: "true",
    PORT: String(E2E_APP_PORT),
    HOSTNAME: E2E_HOST,
  };

  log("app", `starting next start on ${baseUrl}`);
  const child = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "next", "start", "-H", E2E_HOST, "-p", String(E2E_APP_PORT)],
    {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    },
  );
  appProcess = child;

  const appendLog = async (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    process.stdout.write(`[next] ${text}`);
    await writeFile(appLogPath, text, { flag: "a" }).catch(() => undefined);
  };
  child.stdout?.on("data", (c) => void appendLog(c));
  child.stderr?.on("data", (c) => void appendLog(c));
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`[e2e] Next.js exited unexpectedly code=${code} signal=${signal}`);
    }
  });

  await waitForReady(baseUrl, appLogPath);
  return baseUrl;
}

async function waitForReady(baseUrl: string, appLogPath: string) {
  log("ready", `polling ${baseUrl}/api/ready`);
  let lastBody = "";
  try {
    await withTimeout("app-ready", TIMEOUTS.readyPoll, async () => {
      while (true) {
        if (appProcess?.exitCode !== null && appProcess?.exitCode !== undefined) {
          const logs = await readFile(appLogPath, "utf8").catch(() => "(no app log)");
          fail(
            "app-ready",
            `Next.js exited before ready (code=${appProcess.exitCode})`,
            logs.slice(-4000),
          );
        }
        try {
          const response = await fetch(`${baseUrl}/api/ready`, {
            signal: AbortSignal.timeout(3_000),
          });
          lastBody = await response.text();
          if (response.ok) {
            const json = JSON.parse(lastBody) as { ok?: boolean; database?: string };
            if (json.ok === true && json.database === "up") {
              log("ready", `ok ${lastBody}`);
              return;
            }
          }
        } catch (error) {
          lastBody = error instanceof Error ? error.message : String(error);
        }
        await new Promise((r) => setTimeout(r, TIMEOUTS.readyInterval));
      }
    });
  } catch (error) {
    const logs = await readFile(appLogPath, "utf8").catch(() => "(no app log)");
    fail("app-ready", String(error), {
      tip: "Check DATABASE_URL, migration, and Next.js logs",
      lastBody,
      appLogTail: logs.slice(-4000),
    });
  }
}

async function runPlaywright(baseUrl: string, extraArgs: string[]) {
  log("playwright", `running against ${baseUrl}`);
  const args = ["exec", "playwright", "test", ...extraArgs];
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, {
      cwd: ROOT,
      env: {
        ...process.env,
        E2E: "true",
        E2E_BASE_URL: baseUrl,
        E2E_ORCHESTRATED: "true",
        DATABASE_URL: process.env.DATABASE_URL,
        ENABLE_TEST_OTP_ENDPOINT: "true",
        EMAIL_PROVIDER: "memory",
        AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-auth-secret-e2e",
        APP_URL: baseUrl,
      },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (exitCode) => resolve(exitCode ?? 1));
  });
  if (code !== 0) {
    fail("playwright", `exited with code ${code}`);
  }
  log("playwright", "all suites passed");
}

async function teardown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log("teardown", "stopping app and postgres");

  if (appProcess && !appProcess.killed) {
    try {
      if (process.platform === "win32" && appProcess.pid) {
        spawn("taskkill", ["/pid", String(appProcess.pid), "/T", "/F"], {
          stdio: "ignore",
          shell: true,
        });
      } else {
        appProcess.kill("SIGTERM");
      }
    } catch (error) {
      console.warn("teardown app:", error);
    }
    appProcess = null;
  }

  await closeDb().catch(() => undefined);

  if (pgInstance) {
    try {
      await withTimeout("postgres-stop", 15_000, async () => {
        await pgInstance!.stop();
      });
    } catch (error) {
      console.warn("teardown postgres:", error);
    }
    pgInstance = null;
  }

  await rm(DATA_DIR, { recursive: true, force: true }).catch(() => undefined);
  await rm(STATE_FILE, { force: true }).catch(() => undefined);
  log("teardown", "complete");
}

async function writeState(state: StackState) {
  await mkdir(path.dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function main() {
  const started = Date.now();
  const playwrightArgs = process.argv.slice(2);
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  process.on("SIGINT", () => {
    void teardown().finally(() => process.exit(130));
  });
  process.on("SIGTERM", () => {
    void teardown().finally(() => process.exit(143));
  });

  try {
    const databaseUrl = await startPostgres();
    process.env.DATABASE_URL = databaseUrl;
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
    await ensureProductionBuild();
    const baseUrl = await startApp(databaseUrl);
    await writeState({
      databaseUrl,
      pgPort: resolvedPgPort,
      appPort: E2E_APP_PORT,
      appBaseUrl: baseUrl,
      startedAt: new Date().toISOString(),
    });
    await runPlaywright(baseUrl, playwrightArgs);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    log("done", `PASS in ${elapsed}s (app=${E2E_APP_PORT} pg=${resolvedPgPort})`);
    await teardown();
    process.exit(0);
  } catch (error) {
    console.error(error);
    await teardown();
    process.exit(1);
  }
}

main();
