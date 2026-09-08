import { mkdir } from "node:fs/promises";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = path.resolve(process.cwd(), ".data", "pg");
const PORT = Number(process.env.EMBEDDED_PG_PORT ?? 54329);

export async function startEmbeddedPostgres() {
  await mkdir(DATA_DIR, { recursive: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "clinic",
    password: "clinic",
    port: PORT,
    persistent: true,
  });

  try {
    await pg.initialise();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("already")) {
      // Cluster may already be initialized on subsequent runs.
      if (!message.includes("initdb")) {
        console.warn("embedded-postgres initialise:", message);
      }
    }
  }

  await pg.start();
  try {
    await pg.createDatabase("clinic");
  } catch {
    // Database may already exist.
  }

  const url = `postgres://clinic:clinic@127.0.0.1:${PORT}/clinic`;
  return { pg, url, port: PORT };
}

async function main() {
  const { url, port } = await startEmbeddedPostgres();
  console.log(`EMBEDDED_PG_READY port=${port}`);
  console.log(`DATABASE_URL=${url}`);
  // Keep process alive when invoked as db:up
  if (process.argv.includes("--keep-alive")) {
    setInterval(() => undefined, 60_000);
  } else {
    // Caller manages lifecycle when imported; for CLI without keep-alive exit after print.
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("embedded-pg.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
