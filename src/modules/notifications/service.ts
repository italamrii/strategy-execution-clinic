import { and, asc, count, desc, eq, inArray, isNull, lte } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { requirePermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { getDb } from "@/shared/db/client";
import {
  inAppNotifications,
  notificationOutbox,
  notificationPreferences,
  users,
} from "@/shared/db/schema";
import { getEmailProvider } from "@/shared/ports/email";
import {
  EMAIL_TEMPLATE_BY_EVENT,
  EVENT_CATEGORY,
  IN_APP_COPY,
  MAX_OUTBOX_ATTEMPTS,
  OUTBOX_BACKOFF_MS,
  REQUIRED_NOTIFICATION_CATEGORIES,
  type NotificationEventType,
} from "./catalog";
import { toEmailMessage } from "./email-templates";
import { sanitizeProviderError } from "./sanitize";
import { shouldEnqueueTransactionalEmail } from "./email-gate";

function appOrigin() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function isChannelEnabled(
  userId: string,
  category: string,
  channel: "email" | "in_app",
): Promise<boolean> {
  if (REQUIRED_NOTIFICATION_CATEGORIES.has(category as never)) {
    return true;
  }
  const db = getDb();
  const pref = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.category, category),
      eq(notificationPreferences.channel, channel),
    ),
  });
  if (!pref) return true;
  if (pref.isRequired) return true;
  return pref.enabled;
}

export async function scheduleNotification(input: {
  eventType: NotificationEventType;
  recipientUserId: string;
  variables?: Record<string, string>;
  linkPath?: string;
  idempotencyKey: string;
  inAppOverride?: {
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
  };
}) {
  const db = getDb();
  const category = EVENT_CATEGORY[input.eventType];
  const copy = input.inAppOverride ?? IN_APP_COPY[input.eventType];
  const existing = await db.query.notificationOutbox.findFirst({
    where: eq(notificationOutbox.idempotencyKey, input.idempotencyKey),
  });
  if (existing) {
    return { outboxId: existing.id, duplicate: true as const };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, input.recipientUserId),
  });
  if (!user) return { outboxId: null, duplicate: false as const };

  const payload = {
    variables: input.variables ?? {},
    locale: user.locale === "en" ? "en" : "ar",
    linkPath: input.linkPath ?? null,
  };

  const emailEnabled =
    shouldEnqueueTransactionalEmail() &&
    (await isChannelEnabled(input.recipientUserId, category, "email"));
  const inAppEnabled = await isChannelEnabled(input.recipientUserId, category, "in_app");

  let outboxId: string | null = null;
  if (emailEnabled) {
    outboxId = uuidv7();
    await db.insert(notificationOutbox).values({
      id: outboxId,
      eventType: input.eventType,
      recipientUserId: input.recipientUserId,
      channel: "email",
      payload,
      status: "PENDING",
      idempotencyKey: input.idempotencyKey,
    });
  }

  if (inAppEnabled) {
    await db.insert(inAppNotifications).values({
      id: uuidv7(),
      userId: input.recipientUserId,
      eventType: input.eventType,
      category,
      titleAr: copy.titleAr,
      titleEn: copy.titleEn,
      bodyAr: copy.bodyAr,
      bodyEn: copy.bodyEn,
      linkPath: input.linkPath ?? null,
    });
  }

  return { outboxId, duplicate: false as const };
}

export async function processNotificationOutbox(limit = 20): Promise<number> {
  const db = getDb();
  const now = new Date();
  const rows = await db.query.notificationOutbox.findMany({
    where: and(
      eq(notificationOutbox.status, "PENDING"),
      lte(notificationOutbox.availableAt, now),
    ),
    orderBy: [asc(notificationOutbox.createdAt)],
    limit,
  });
  const ids = rows.map((r) => r.id);
  if (!ids.length) return 0;

  await db
    .update(notificationOutbox)
    .set({ status: "PROCESSING" })
    .where(inArray(notificationOutbox.id, ids));

  let processed = 0;
  for (const id of ids) {
    const row = await db.query.notificationOutbox.findFirst({
      where: eq(notificationOutbox.id, id),
    });
    if (!row || row.channel !== "email") continue;

    const user = await db.query.users.findFirst({
      where: eq(users.id, row.recipientUserId),
    });
    if (!user?.email) {
      await db
        .update(notificationOutbox)
        .set({
          status: "FAILED",
          failedAt: new Date(),
          lastErrorSanitized: "recipient_email_missing",
          attempts: row.attempts + 1,
        })
        .where(eq(notificationOutbox.id, id));
      continue;
    }

    try {
      const payload = row.payload as {
        variables?: Record<string, string>;
        locale?: "ar" | "en";
      };
      const locale = payload.locale === "en" ? "en" : "ar";
      const template =
        EMAIL_TEMPLATE_BY_EVENT[row.eventType as NotificationEventType] ??
        "system.announcement";
      const message = toEmailMessage({
        to: user.email,
        locale,
        template,
        variables: payload.variables ?? {},
        appOrigin: appOrigin(),
      });
      const provider = getEmailProvider();
      await provider.send({
        to: message.to,
        locale: message.locale,
        template: message.template,
        variables: message.variables,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      await db
        .update(notificationOutbox)
        .set({
          status: "SENT",
          sentAt: new Date(),
          attempts: row.attempts + 1,
          lastErrorSanitized: null,
        })
        .where(eq(notificationOutbox.id, id));
      processed += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const failed = attempts >= MAX_OUTBOX_ATTEMPTS;
      const backoff = OUTBOX_BACKOFF_MS[Math.min(attempts, OUTBOX_BACKOFF_MS.length - 1)] ?? 300_000;
      await db
        .update(notificationOutbox)
        .set({
          status: failed ? "FAILED" : "PENDING",
          attempts,
          failedAt: failed ? new Date() : null,
          availableAt: failed ? row.availableAt : new Date(Date.now() + backoff),
          lastErrorSanitized: sanitizeProviderError(error),
        })
        .where(eq(notificationOutbox.id, id));
    }
  }
  return processed;
}

export async function retryFailedNotification(input: {
  actorUserId: string;
  outboxId: string;
}) {
  await requirePermission(input.actorUserId, "notification.ops.manage");
  const db = getDb();
  const row = await db.query.notificationOutbox.findFirst({
    where: eq(notificationOutbox.id, input.outboxId),
  });
  if (!row || row.status !== "FAILED") {
    throw new Error("notification_not_retryable");
  }
  await db
    .update(notificationOutbox)
    .set({
      status: "PENDING",
      availableAt: new Date(),
      failedAt: null,
      lastErrorSanitized: null,
    })
    .where(eq(notificationOutbox.id, input.outboxId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "NOTIFICATION_RETRY_REQUESTED",
    resourceType: "notification_outbox",
    resourceId: input.outboxId,
  });
}

export async function listUserNotifications(input: {
  userId: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission(input.userId, "notification.read.own");
  const db = getDb();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const items = await db.query.inAppNotifications.findMany({
    where: eq(inAppNotifications.userId, input.userId),
    orderBy: [desc(inAppNotifications.createdAt)],
    limit: pageSize,
    offset,
  });
  const [{ total }] = await db
    .select({ total: count() })
    .from(inAppNotifications)
    .where(eq(inAppNotifications.userId, input.userId));
  return { items, page, pageSize, total: Number(total ?? 0) };
}

export async function getUnreadNotificationCount(userId: string) {
  await requirePermission(userId, "notification.read.own");
  const db = getDb();
  const [{ total }] = await db
    .select({ total: count() })
    .from(inAppNotifications)
    .where(and(eq(inAppNotifications.userId, userId), isNull(inAppNotifications.readAt)));
  return Number(total ?? 0);
}

export async function markNotificationRead(input: {
  userId: string;
  notificationId: string;
}) {
  await requirePermission(input.userId, "notification.read.own");
  const db = getDb();
  const row = await db.query.inAppNotifications.findFirst({
    where: and(
      eq(inAppNotifications.id, input.notificationId),
      eq(inAppNotifications.userId, input.userId),
    ),
  });
  if (!row) throw new AuthorizationError("forbidden");
  if (row.readAt) return;
  await db
    .update(inAppNotifications)
    .set({ readAt: new Date() })
    .where(eq(inAppNotifications.id, input.notificationId));
}

export async function markAllNotificationsRead(userId: string) {
  await requirePermission(userId, "notification.read.own");
  const db = getDb();
  await db
    .update(inAppNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(inAppNotifications.userId, userId), isNull(inAppNotifications.readAt)));
}

export async function updateNotificationPreference(input: {
  userId: string;
  category: string;
  channel: "email" | "in_app";
  enabled: boolean;
}) {
  await requirePermission(input.userId, "notification.manage.own");
  if (REQUIRED_NOTIFICATION_CATEGORIES.has(input.category as never)) {
    throw new AuthorizationError("required_notification_category");
  }
  const db = getDb();
  const existing = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, input.userId),
      eq(notificationPreferences.category, input.category),
      eq(notificationPreferences.channel, input.channel),
    ),
  });
  if (existing) {
    await db
      .update(notificationPreferences)
      .set({ enabled: input.enabled, updatedAt: new Date() })
      .where(eq(notificationPreferences.id, existing.id));
    return;
  }
  await db.insert(notificationPreferences).values({
    id: uuidv7(),
    userId: input.userId,
    category: input.category,
    channel: input.channel,
    enabled: input.enabled,
    isRequired: false,
  });
}

export async function countFailedNotifications() {
  const db = getDb();
  const [{ total }] = await db
    .select({ total: count() })
    .from(notificationOutbox)
    .where(eq(notificationOutbox.status, "FAILED"));
  return Number(total ?? 0);
}

export async function listFailedNotifications(limit = 20) {
  const db = getDb();
  return db.query.notificationOutbox.findMany({
    where: eq(notificationOutbox.status, "FAILED"),
    orderBy: [desc(notificationOutbox.failedAt)],
    limit,
  });
}

export async function drainOutboxForTests(limit = 50) {
  let total = 0;
  for (let i = 0; i < 10; i += 1) {
    const n = await processNotificationOutbox(limit);
    total += n;
    if (n === 0) break;
  }
  return total;
}
