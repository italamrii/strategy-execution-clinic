import { writeFile } from "node:fs/promises";
import path from "node:path";
import { startEmbeddedPostgres } from "./embedded-pg";

async function main() {
  const { url, port, pg } = await startEmbeddedPostgres();
  await writeFile(
    path.resolve(process.cwd(), ".data", "embedded-pg.json"),
    JSON.stringify({ url, port, startedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
  console.log(`Embedded PostgreSQL listening on ${port}`);
  console.log(`DATABASE_URL=${url}`);
  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });
  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
