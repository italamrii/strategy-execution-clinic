import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { closeDb, resetDb } from "../src/shared/db/client";
import { backfillCredentials } from "../src/modules/credentials";

async function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const raw = await readFile(path.resolve(process.cwd(), ".data", "embedded-pg.json"), "utf8");
  return JSON.parse(raw).url as string;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await resetDb(await resolveUrl());
  const result = await backfillCredentials({ dryRun });
  await closeDb();
  console.log(dryRun ? "DRY RUN" : "BACKFILL COMPLETE", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
