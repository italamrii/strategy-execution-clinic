import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { closeDb, resetDb } from "../src/shared/db/client";
import { seedRbacCatalog } from "../src/modules/identity/rbac/service";

async function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const raw = await readFile(path.resolve(process.cwd(), ".data", "embedded-pg.json"), "utf8");
  return JSON.parse(raw).url as string;
}

async function main() {
  await resetDb(await resolveUrl());
  await seedRbacCatalog();
  await closeDb();
  console.log("RBAC catalog seeded");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
