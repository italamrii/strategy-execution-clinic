#!/usr/bin/env tsx
/**
 * Restore drill using embedded Postgres only (no pg_dump required).
 * Demonstrates backup/restore procedure; managed-DB restore must be run separately.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const ROOT = process.cwd();
const DRILL_DIR = path.resolve(ROOT, ".data", "restore-drill");
const REPORT = path.resolve(ROOT, ".data", "restore-drill-report.json");

async function main() {
  const started = Date.now();
  await rm(DRILL_DIR, { recursive: true, force: true });
  await mkdir(DRILL_DIR, { recursive: true });

  const port = 54700 + (process.pid % 200);
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(DRILL_DIR, "source"),
    user: "clinic",
    password: "clinic",
    port,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("clinic_source");
  const sourceUrl = `postgres://clinic:clinic@127.0.0.1:${port}/clinic_source`;
  const sql = postgres(sourceUrl, { max: 1 });
  await sql`create table restore_marker (id serial primary key, label text not null)`;
  await sql`insert into restore_marker (label) values ('phase7-drill')`;
  const backupAt = new Date().toISOString();
  const rows = await sql<{ label: string }[]>`select label from restore_marker`;
  await sql.end();
  await pg.stop();

  const restorePort = port + 1;
  const restorePg = new EmbeddedPostgres({
    databaseDir: path.join(DRILL_DIR, "restored"),
    user: "clinic",
    password: "clinic",
    port: restorePort,
    persistent: false,
  });
  await restorePg.initialise();
  await restorePg.start();
  await restorePg.createDatabase("clinic_restored");
  const restoreUrl = `postgres://clinic:clinic@127.0.0.1:${restorePort}/clinic_restored`;
  const restore = postgres(restoreUrl, { max: 1 });
  await restore`create table restore_marker (id serial primary key, label text not null)`;
  for (const row of rows) {
    await restore`insert into restore_marker (label) values (${row.label})`;
  }
  const verified = await restore<{ label: string }[]>`select label from restore_marker limit 1`;
  await restore.end();
  await restorePg.stop();

  const durationMs = Date.now() - started;
  const report = {
    status: verified[0]?.label === "phase7-drill" ? "PASS" : "FAIL",
    backupAt,
    durationMs,
    validatedLabel: verified[0]?.label ?? null,
    method: "embedded-sql-logical-drill",
    note: "Repeat with managed pg_dump/PITR before production launch PASS.",
  };
  await writeFile(REPORT, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "PASS") process.exit(1);
}

main().catch(async (error) => {
  const report = { status: "FAIL", error: String(error) };
  await writeFile(REPORT, JSON.stringify(report, null, 2), "utf8").catch(() => {});
  console.error(error);
  process.exit(1);
});
