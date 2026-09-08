#!/usr/bin/env tsx
/**
 * Local/staging backup helper. Production: use managed provider snapshots + WAL/PITR.
 * Requires pg_dump on PATH and DATABASE_URL.
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const outDir = path.resolve(process.cwd(), ".data", "backups");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(outDir, `clinic-${stamp}.sql`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pg_dump", [url, "-f", file, "--no-owner", "--no-acl"], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump exit ${code}`))));
  });
  console.log(`backup written: ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
