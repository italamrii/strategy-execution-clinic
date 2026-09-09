import { and, desc, eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { getPermissionsForUser, requirePermission } from "@/modules/identity";
import { sanitizePlainText } from "@/modules/notifications/sanitize";
import { getDb } from "@/shared/db/client";
import { consultationRequests, meetingParticipants, meetingRooms } from "@/shared/db/schema";
import { MeetingError } from "./errors";

function configuredJitsiOrigin() {
  const raw = process.env.JITSI_DOMAIN?.trim() || "meet.jit.si";
  const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  if (url.protocol !== "https:") throw new MeetingError("provider_misconfigured");
  return url.origin;
}

export function meetingEmbedUrl(roomKey: string) {
  const params = new URLSearchParams({
    "config.prejoinPageEnabled": "true",
    "config.disableDeepLinking": "true",
    "config.fileRecordingsEnabled": "false",
    "config.liveStreamingEnabled": "false",
    "config.hiddenDomain": "",
  });
  return `${configuredJitsiOrigin()}/${encodeURIComponent(roomKey)}#${params.toString()}`;
}

async function hasMeetingAccess(userId: string, meetingId: string) {
  const db = getDb();
  const participant = await db.query.meetingParticipants.findFirst({
    where: and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)),
  });
  if (participant) return true;
  return (await getPermissionsForUser(userId)).includes("meeting.manage");
}

export async function createMeeting(input: {
  actorUserId: string;
  consultationId?: string | null;
  trackId?: string | null;
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  allowAudio?: boolean;
  allowVideo?: boolean;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "meeting.create");
  const db = getDb();
  let consultation: typeof consultationRequests.$inferSelect | null = null;
  if (input.consultationId) {
    consultation = await db.query.consultationRequests.findFirst({ where: eq(consultationRequests.id, input.consultationId) }) ?? null;
    if (!consultation) throw new MeetingError("consultation_not_found");
    const permissions = await getPermissionsForUser(input.actorUserId);
    if (consultation.assignedExpertUserId !== input.actorUserId && !permissions.includes("meeting.manage")) {
      throw new MeetingError("forbidden");
    }
  }
  if (input.endsAt && input.endsAt <= input.startsAt) throw new MeetingError("invalid_time");
  const id = uuidv7();
  const roomKey = `sec-${randomBytes(18).toString("hex")}`;
  await db.insert(meetingRooms).values({
    id,
    consultationId: input.consultationId ?? null,
    trackId: input.trackId ?? consultation?.trackId ?? null,
    createdBy: input.actorUserId,
    title: sanitizePlainText(input.title, 180),
    provider: "jitsi",
    roomKey,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    allowAudio: input.allowAudio ?? true,
    allowVideo: input.allowVideo ?? true,
  });
  const participants = new Map<string, "host" | "attendee">([[input.actorUserId, "host"]]);
  if (consultation) {
    participants.set(consultation.requesterUserId, "attendee");
    if (consultation.assignedExpertUserId) participants.set(consultation.assignedExpertUserId, "host");
  }
  await db.insert(meetingParticipants).values([...participants].map(([userId, role]) => ({
    id: uuidv7(), meetingId: id, userId, role, status: "invited",
  })));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "MEETING_CREATED",
    resourceType: "meeting",
    resourceId: id,
    requestId: input.requestId,
    after: { consultationId: input.consultationId ?? null, startsAt: input.startsAt.toISOString() },
  });
  return { id };
}

export async function listMeetingsForUser(userId: string) {
  const db = getDb();
  const permissions = await getPermissionsForUser(userId);
  if (permissions.includes("meeting.manage")) {
    return db.query.meetingRooms.findMany({ orderBy: [desc(meetingRooms.startsAt)] });
  }
  const participantRows = await db.query.meetingParticipants.findMany({ where: eq(meetingParticipants.userId, userId) });
  if (participantRows.length === 0) return [];
  const ids = participantRows.map((row) => row.meetingId);
  return db.query.meetingRooms.findMany({
    where: inArray(meetingRooms.id, ids),
    orderBy: [desc(meetingRooms.startsAt)],
  });
}

export async function getMeetingForUser(userId: string, meetingId: string) {
  const db = getDb();
  const meeting = await db.query.meetingRooms.findFirst({ where: eq(meetingRooms.id, meetingId) });
  if (!meeting) throw new MeetingError("not_found");
  if (!(await hasMeetingAccess(userId, meeting.id))) throw new MeetingError("forbidden");
  const participant = await db.query.meetingParticipants.findFirst({
    where: and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)),
  });
  const permissions = await getPermissionsForUser(userId);
  const isHost = participant?.role === "host" || permissions.includes("meeting.manage");
  const canStart =
    meeting.status === "scheduled" &&
    isHost &&
    permissions.includes("meeting.start");
  const canManageLifecycle = isHost && (permissions.includes("meeting.manage") || permissions.includes("meeting.start"));
  return {
    ...meeting,
    embedUrl: meeting.status === "cancelled" || meeting.status === "completed" ? null : meetingEmbedUrl(meeting.roomKey),
    participantRole: participant?.role ?? null,
    canStart,
    canComplete: meeting.status === "live" && canManageLifecycle,
    canCancel: (meeting.status === "scheduled" || meeting.status === "live") && canManageLifecycle,
  };
}

export async function markMeetingJoined(userId: string, meetingId: string) {
  const db = getDb();
  const meeting = await db.query.meetingRooms.findFirst({ where: eq(meetingRooms.id, meetingId) });
  if (!meeting) throw new MeetingError("not_found");
  if (!(await hasMeetingAccess(userId, meetingId))) throw new MeetingError("forbidden");
  if (meeting.status === "cancelled" || meeting.status === "completed") {
    throw new MeetingError("not_joinable");
  }
  await db.update(meetingParticipants).set({ status: "joined", joinedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)));
}

const LIFECYCLE: Record<string, { from: readonly string[]; permission: "meeting.start" | "meeting.manage" }> = {
  live: { from: ["scheduled"], permission: "meeting.start" },
  completed: { from: ["live", "scheduled"], permission: "meeting.manage" },
  cancelled: { from: ["scheduled", "live"], permission: "meeting.manage" },
};

export async function updateMeetingStatus(input: {
  actorUserId: string;
  meetingId: string;
  status: "live" | "completed" | "cancelled";
  requestId?: string | null;
}) {
  const db = getDb();
  const meeting = await db.query.meetingRooms.findFirst({ where: eq(meetingRooms.id, input.meetingId) });
  if (!meeting) throw new MeetingError("not_found");
  const participant = await db.query.meetingParticipants.findFirst({
    where: and(eq(meetingParticipants.meetingId, input.meetingId), eq(meetingParticipants.userId, input.actorUserId)),
  });
  const permissions = await getPermissionsForUser(input.actorUserId);
  const isHost = participant?.role === "host" || permissions.includes("meeting.manage");
  if (!isHost) throw new MeetingError("forbidden");
  const rule = LIFECYCLE[input.status];
  if (!rule || !rule.from.includes(meeting.status)) throw new MeetingError("invalid_status");
  if (input.status === "live") {
    await requirePermission(input.actorUserId, "meeting.start");
  } else if (!permissions.includes("meeting.manage") && !permissions.includes("meeting.start")) {
    throw new MeetingError("forbidden");
  }
  await db.update(meetingRooms).set({
    status: input.status,
    updatedAt: new Date(),
  }).where(eq(meetingRooms.id, meeting.id));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "MEETING_STATUS_CHANGED",
    resourceType: "meeting",
    resourceId: meeting.id,
    requestId: input.requestId,
    before: { status: meeting.status },
    after: { status: input.status },
  });
}

