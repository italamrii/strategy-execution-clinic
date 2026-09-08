#!/usr/bin/env tsx
import "dotenv/config";
import { closeDb } from "../src/shared/db/client";
import { processNotificationOutbox } from "../src/modules/notifications";
import { logger } from "../src/shared/logging/logger";

let shuttingDown = false;
process.on("SIGTERM", () => {
  shuttingDown = true;
});
process.on("SIGINT", () => {
  shuttingDown = true;
});

async function main() {
  if (shuttingDown) return;
  const processed = await processNotificationOutbox(50);
  logger.info("notification-worker.batch", { processed });
  await closeDb();
}

main().catch((error) => {
  logger.error("notification-worker.failed", { error: String(error) });
  process.exit(1);
});
