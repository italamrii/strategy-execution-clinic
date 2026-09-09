import { asc, desc, eq, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { getPermissionsForUser, requirePermission } from "@/modules/identity";
import { sanitizePlainText, sanitizeRichText } from "@/modules/notifications/sanitize";
import { getDb } from "@/shared/db/client";
import {
  consultationMessages,
  consultationRequests,
  profiles,
  tracks,
  users,
} from "@/shared/db/schema";
import { ConsultationError } from "./errors";

const ADMIN_READ = "consultation.read.any";

export async function listEligibleConsultationExperts() {
  const db = getDb();
  const candidates = await db.select({
    userId: users.id,
    displayNameAr: profiles.displayNameAr,
    displayNameEn: profiles.displayNameEn,
  }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.status, "active"));
  const eligibility = await Promise.all(candidates.map(async (candidate) => ({
    ...candidate,
    eligible: (await getPermissionsForUser(candidate.userId)).includes("consultation.respond"),
  })));
  return eligibility.filter((candidate) => candidate.eligible).map((candidate) => ({
    userId: candidate.userId,
    displayNameAr: candidate.displayNameAr,
    displayNameEn: candidate.displayNameEn,
  }));
}

async function canAccess(userId: string, request: typeof consultationRequests.$inferSelect) {
  if (request.requesterUserId === userId || request.assignedExpertUserId === userId) return true;
  return (await getPermissionsForUser(userId)).includes(ADMIN_READ);
}

export async function createConsultation(input: {
  actorUserId: string;
  trackId?: string | null;
  subject: string;
  description: string;
  desiredOutcome?: string | null;
  urgency?: "normal" | "urgent";
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "consultation.create");
  const db = getDb();
  if (input.trackId) {
    const track = await db.query.tracks.findFirst({ where: eq(tracks.id, input.trackId) });
    if (!track || !track.isEnabled) throw new ConsultationError("track_not_found");
  }
  const id = uuidv7();
  await db.insert(consultationRequests).values({
    id,
    requesterUserId: input.actorUserId,
    trackId: input.trackId ?? null,
    subject: sanitizePlainText(input.subject, 180),
    description: sanitizeRichText(input.description),
    desiredOutcome: input.desiredOutcome ? sanitizeRichText(input.desiredOutcome) : null,
    urgency: input.urgency ?? "normal",
    status: "submitted",
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "CONSULTATION_REQUESTED",
    resourceType: "consultation",
    resourceId: id,
    requestId: input.requestId,
    after: { trackId: input.trackId ?? null, urgency: input.urgency ?? "normal" },
  });
  return { id };
}

export async function listConsultationsForUser(userId: string) {
  const db = getDb();
  const permissions = await getPermissionsForUser(userId);
  const where = permissions.includes(ADMIN_READ)
    ? undefined
    : or(
        eq(consultationRequests.requesterUserId, userId),
        eq(consultationRequests.assignedExpertUserId, userId),
      );
  const rows = await db.query.consultationRequests.findMany({
    where,
    orderBy: [desc(consultationRequests.updatedAt)],
  });
  return rows;
}

export async function getConsultationForUser(userId: string, id: string) {
  const db = getDb();
  const request = await db.query.consultationRequests.findFirst({
    where: eq(consultationRequests.id, id),
  });
  if (!request) throw new ConsultationError("not_found");
  if (!(await canAccess(userId, request))) throw new ConsultationError("forbidden");
  const [messages, track, requester, expert] = await Promise.all([
    db.query.consultationMessages.findMany({
      where: eq(consultationMessages.requestId, id),
      orderBy: [asc(consultationMessages.createdAt)],
    }),
    request.trackId
      ? db.query.tracks.findFirst({ where: eq(tracks.id, request.trackId) })
      : null,
    db.query.profiles.findFirst({ where: eq(profiles.userId, request.requesterUserId) }),
    request.assignedExpertUserId
      ? db.query.profiles.findFirst({ where: eq(profiles.userId, request.assignedExpertUserId) })
      : null,
  ]);
  return { request, messages, track, requester, expert };
}

export async function addConsultationMessage(input: {
  actorUserId: string;
  consultationId: string;
  body: string;
  requestId?: string | null;
}) {
  const db = getDb();
  const request = await db.query.consultationRequests.findFirst({
    where: eq(consultationRequests.id, input.consultationId),
  });
  if (!request) throw new ConsultationError("not_found");
  if (!(await canAccess(input.actorUserId, request))) throw new ConsultationError("forbidden");
  if (["closed", "cancelled"].includes(request.status)) throw new ConsultationError("closed");
  const id = uuidv7();
  await db.insert(consultationMessages).values({
    id,
    requestId: request.id,
    authorUserId: input.actorUserId,
    body: sanitizeRichText(input.body),
  });
  await db.update(consultationRequests).set({ updatedAt: new Date() }).where(eq(consultationRequests.id, request.id));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "CONSULTATION_MESSAGE_ADDED",
    resourceType: "consultation",
    resourceId: request.id,
    requestId: input.requestId,
  });
  return { id };
}

export async function assignConsultation(input: {
  actorUserId: string;
  consultationId: string;
  expertUserId: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "consultation.assign");
  const db = getDb();
  const request = await db.query.consultationRequests.findFirst({ where: eq(consultationRequests.id, input.consultationId) });
  if (!request) throw new ConsultationError("not_found");
  const expert = await db.query.users.findFirst({ where: eq(users.id, input.expertUserId) });
  if (!expert || expert.status !== "active") throw new ConsultationError("expert_not_found");
  const expertPermissions = await getPermissionsForUser(input.expertUserId);
  if (!expertPermissions.includes("consultation.respond")) throw new ConsultationError("expert_not_eligible");
  await db.update(consultationRequests).set({
    assignedExpertUserId: input.expertUserId,
    status: "assigned",
    updatedAt: new Date(),
  }).where(eq(consultationRequests.id, input.consultationId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "CONSULTATION_ASSIGNED",
    resourceType: "consultation",
    resourceId: input.consultationId,
    requestId: input.requestId,
    after: { expertUserId: input.expertUserId },
  });
}

export async function updateConsultationStatus(input: {
  actorUserId: string;
  consultationId: string;
  status: "in_progress" | "completed" | "closed" | "cancelled";
  requestId?: string | null;
}) {
  const db = getDb();
  const request = await db.query.consultationRequests.findFirst({ where: eq(consultationRequests.id, input.consultationId) });
  if (!request) throw new ConsultationError("not_found");
  const permissions = await getPermissionsForUser(input.actorUserId);
  const expertCanUpdate = request.assignedExpertUserId === input.actorUserId && permissions.includes("consultation.respond");
  const ownerCanCancel = request.requesterUserId === input.actorUserId && input.status === "cancelled";
  if (!expertCanUpdate && !ownerCanCancel && !permissions.includes("consultation.manage")) {
    throw new ConsultationError("forbidden");
  }
  const now = new Date();
  await db.update(consultationRequests).set({
    status: input.status,
    acceptedAt: input.status === "in_progress" ? request.acceptedAt ?? now : request.acceptedAt,
    completedAt: input.status === "completed" ? now : request.completedAt,
    closedAt: ["closed", "cancelled"].includes(input.status) ? now : request.closedAt,
    updatedAt: now,
  }).where(eq(consultationRequests.id, request.id));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "CONSULTATION_STATUS_CHANGED",
    resourceType: "consultation",
    resourceId: request.id,
    requestId: input.requestId,
    before: { status: request.status },
    after: { status: input.status },
  });
}
