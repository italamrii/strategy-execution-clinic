import type { NotificationEventType } from "./catalog";
import { drainOutboxForTests, scheduleNotification } from "./service";

export async function notifyDomainEvent(input: {
  eventType: NotificationEventType;
  recipientUserId: string;
  variables?: Record<string, string>;
  linkPath?: string;
  idempotencyKey: string;
}) {
  const result = await scheduleNotification(input);
  if (process.env.E2E === "true" || process.env.NODE_ENV === "test") {
    await drainOutboxForTests();
  }
  return result;
}
