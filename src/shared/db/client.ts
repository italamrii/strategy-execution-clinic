import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

let cached: Database | null = null;
let cachedSql: ReturnType<typeof postgres> | null = null;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  return url;
}

export function createDb(url = getDatabaseUrl()) {
  const sql = postgres(url, { max: 10, prepare: false });
  return drizzle(sql, { schema });
}

export function getDb(): Database {
  if (!cached) {
    cachedSql = postgres(getDatabaseUrl(), { max: 10, prepare: false });
    cached = drizzle(cachedSql, { schema });
  }
  return cached;
}

export async function resetDb(url?: string): Promise<Database> {
  await closeDb();
  if (url) {
    process.env.DATABASE_URL = url;
  }
  return getDb();
}

export async function closeDb(): Promise<void> {
  if (cachedSql) {
    await cachedSql.end({ timeout: 5 });
    cachedSql = null;
    cached = null;
  }
}

export { schema };
