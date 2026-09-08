#!/usr/bin/env tsx
import "dotenv/config";
import { closeDb } from "../src/shared/db/client";
import { processNotificationOutbox, countFailedNotifications } from "../src/modules/notifications";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("worker-health: DATABASE_URL missing");
    process.exit(1);
  }
  const processed = await processNotificationOutbox(1);
  const failed = await countFailedNotifications();
  console.log(
    JSON.stringify({
      ok: true,
      processedProbe: processed,
      failedNotifications: failed,
      at: new Date().toISOString(),
    }),
  );
  await closeDb();
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error) }));
  process.exit(1);
});
