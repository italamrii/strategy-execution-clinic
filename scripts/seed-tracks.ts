import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { closeDb, resetDb } from "../src/shared/db/client";
import { seedMembershipCatalog } from "../src/modules/membership/catalog-service";
import { seedTracksOperatingCatalog } from "../src/modules/tracks";
import { seedRbacCatalog } from "../src/modules/identity";

async function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const raw = await readFile(path.resolve(process.cwd(), ".data", "embedded-pg.json"), "utf8");
  return JSON.parse(raw).url as string;
}

async function main() {
  await resetDb(await resolveUrl());
  await seedRbacCatalog();
  await seedMembershipCatalog();
  await seedTracksOperatingCatalog();
  await seedTracksOperatingCatalog();
  await closeDb();
  console.log("Tracks operating catalog seeded (idempotent)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
