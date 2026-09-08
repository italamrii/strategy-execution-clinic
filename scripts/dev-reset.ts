#!/usr/bin/env tsx
/**
 * pnpm dev:reset — drops and recreates the local development database, then re-migrates and re-seeds.
 * Only touches .data/pg (local dev). Never affects staging or production.
 */
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const ROOT = process.cwd();
const DATA_DIR = path.resolve(ROOT, ".data", "pg");
const PORT = Number(process.env.EMBEDDED_PG_PORT ?? 54329);
const DATABASE_URL = `postgres://clinic:clinic@127.0.0.1:${PORT}/clinic`;

function log(tag: string, msg: string) {
  console.log(`[dev:reset] ${tag}: ${msg}`);
}

async function main() {
  log("info", "Resetting local development database...");
  log("info", `Data directory: ${DATA_DIR}`);

  // Remove old data directory
  log("postgres", "removing old data directory");
  await rm(DATA_DIR, { recursive: true, force: true });
  await mkdir(DATA_DIR, { recursive: true });

  // Initialize fresh Postgres
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "clinic",
    password: "clinic",
    port: PORT,
    persistent: true,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("clinic");
  log("postgres", "fresh PostgreSQL started");

  // Verify connectivity
  const sqlPing = postgres(DATABASE_URL, { max: 1 });
  await sqlPing`SELECT 1`;
  await sqlPing.end({ timeout: 3 });
  log("postgres", "SELECT 1 succeeded");

  // Migrations
  log("migrate", "applying migrations");
  const sqlMigrate = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sqlMigrate);
  await migrate(db, { migrationsFolder: path.resolve(ROOT, "drizzle") });
  await sqlMigrate.end({ timeout: 5 });
  log("migrate", "migrations applied");

  // Seeds
  process.env.DATABASE_URL = DATABASE_URL;
  const { closeDb, resetDb } = await import("../src/shared/db/client");
  await resetDb(DATABASE_URL);

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

  // Verify home.hero
  const sqlVerify = postgres(DATABASE_URL, { max: 1 });
  const rows = await sqlVerify<{ slug: string }[]>`SELECT slug FROM content_blocks WHERE slug = 'home.hero' LIMIT 1`;
  await sqlVerify.end({ timeout: 3 });
  if (rows.length === 0) throw new Error("home.hero missing after seed");
  log("verify", "content_blocks home.hero confirmed");

  await pg.stop();
  log("done", "Local development database reset complete. Run pnpm dev:local to start.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
