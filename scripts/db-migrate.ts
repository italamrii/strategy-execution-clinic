import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function resolveDatabaseUrl(): Promise<string> {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  try {
    const raw = await readFile(
      path.resolve(process.cwd(), ".data", "embedded-pg.json"),
      "utf8",
    );
    return JSON.parse(raw).url as string;
  } catch {
    throw new Error("DATABASE_URL is not set and embedded-pg.json was not found. Run pnpm db:up first.");
  }
}

async function main() {
  const url = await resolveDatabaseUrl();
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  await sql.end({ timeout: 5 });
  console.log("Migrations applied successfully");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
