import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { bootstrapSuperAdmin } from "../src/modules/identity/bootstrap";
import { closeDb, resetDb } from "../src/shared/db/client";

async function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const raw = await readFile(path.resolve(process.cwd(), ".data", "embedded-pg.json"), "utf8");
  return JSON.parse(raw).url as string;
}

async function main() {
  await resetDb(await resolveUrl());
  const result = await bootstrapSuperAdmin();
  console.log("Bootstrap complete:", result);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
