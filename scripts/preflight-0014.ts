import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
    throw new Error(
      "DATABASE_URL is not set and embedded-pg.json was not found. Run pnpm db:up first.",
    );
  }
}

async function main() {
  const url = await resolveDatabaseUrl();
  const query = await readFile(
    path.resolve(process.cwd(), "drizzle/0014_support_and_membership_validity.preflight.sql"),
    "utf8",
  );
  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql.unsafe(query);
    if (rows.length === 0) {
      console.log("0014 preflight: 0 membership_types rows would be modified.");
      return;
    }
    console.log(`0014 preflight: ${rows.length} membership_types row(s) would be modified:`);
    console.table(
      rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name_en: row.name_en,
        validity_mode: row.validity_mode,
        validity_days: row.validity_days,
        renewal_required: row.renewal_required,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
