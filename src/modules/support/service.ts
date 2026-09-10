import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { consumeRateLimit, requirePermission } from "@/modules/identity";
import { sanitizePlainText, sanitizeRichText } from "@/modules/notifications/sanitize";
import { getDb } from "@/shared/db/client";
import { supportRequests } from "@/shared/db/schema";
import { SupportError } from "./errors";
import { type SupportCategory } from "./catalog";

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 40);
}

export async function createSupportRequest(input: {
  actorUserId?: string | null;
  category: SupportCategory;
  subject: string;
  message: string;
  replyEmail: string;
  locale: "ar" | "en";
  honeypot?: string | null;
  ip?: string | null;
  requestId?: string | null;
}) {
  if (input.honeypot?.trim()) {
    throw new SupportError("invalid_input");
  }
  const ipKey = hashIp(input.ip?.trim() || "unknown");
  await consumeRateLimit({
    key: `support:${ipKey}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  await consumeRateLimit({
    key: `support-email:${input.replyEmail.trim().toLowerCase()}`,
    limit: 4,
    windowMs: 60 * 60 * 1000,
  });

  const id = uuidv7();
  const db = getDb();
  await db.insert(supportRequests).values({
    id,
    userId: input.actorUserId ?? null,
    category: input.category,
    subject: sanitizePlainText(input.subject, 180),
    message: sanitizeRichText(input.message),
    replyEmail: sanitizePlainText(input.replyEmail.trim().toLowerCase(), 254),
    locale: input.locale,
    status: "open",
    ipHash: ipKey,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "SUPPORT_REQUEST_CREATED",
    resourceType: "support_request",
    resourceId: id,
    requestId: input.requestId,
    after: { category: input.category },
  });
  return { id };
}

export async function listSupportRequestsForAdmin(actorUserId: string) {
  await requirePermission(actorUserId, "support.request.read.any");
  const db = getDb();
  return db.query.supportRequests.findMany({
    orderBy: [desc(supportRequests.createdAt)],
    limit: 100,
  });
}

export async function updateSupportRequestStatus(input: {
  actorUserId: string;
  requestId: string;
  status: "open" | "in_progress" | "resolved";
  adminNotes?: string | null;
}) {
  await requirePermission(input.actorUserId, "support.request.read.any");
  const db = getDb();
  const row = await db.query.supportRequests.findFirst({
    where: eq(supportRequests.id, input.requestId),
  });
  if (!row) throw new SupportError("not_found");
  await db
    .update(supportRequests)
    .set({
      status: input.status,
      adminNotes: input.adminNotes ? sanitizePlainText(input.adminNotes, 2000) : row.adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(supportRequests.id, input.requestId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "SUPPORT_REQUEST_UPDATED",
    resourceType: "support_request",
    resourceId: input.requestId,
    after: { status: input.status },
  });
}
