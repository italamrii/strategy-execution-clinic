import { and, count, eq, inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit, writeSecurityEvent } from "@/modules/audit";
import {
  assertCanApproveMembershipApplication,
  assertCanIssueMembership,
  assertCanReviewMembershipApplication,
  assertNotSelfApplicationReview,
  requirePermission,
  type Actor,
} from "@/modules/identity";
import { getDb } from "@/shared/db/client";
import {
  memberTracks,
  membershipApplicationReviews,
  membershipApplications,
  membershipApplicationTracks,
  memberships,
  membershipStatusHistory,
  membershipTypes,
  tracks,
  users,
} from "@/shared/db/schema";
import {
  type AdminApplicationDto,
  type MemberApplicationDto,
  type MemberMembershipDto,
  toMembershipTypeDto,
  toTrackDto,
} from "./dto";
import { MembershipError } from "./errors";
import type { ApplicationDraftInput } from "./schemas";
import { ELEVATED_APPROVAL_SLUGS } from "./catalog";
import {
  assertApplicationTransition,
  OPEN_APPLICATION_STATUSES,
  type ApplicationStatus,
  type MembershipStatus,
} from "./states";

function isOpenStatus(status: string): status is ApplicationStatus {
  return (OPEN_APPLICATION_STATUSES as readonly string[]).includes(status);
}

export async function assertEligibleMembershipType(
  membershipTypeId: string,
  options?: { allowInvitationOnly?: boolean },
) {
  const db = getDb();
  const type = await db.query.membershipTypes.findFirst({
    where: eq(membershipTypes.id, membershipTypeId),
  });
  if (!type || !type.isEnabled) {
    throw new MembershipError("membership_type_inactive");
  }
  if (type.invitationOnly && !options?.allowInvitationOnly) {
    throw new MembershipError("invitation_only");
  }
  if (!type.applicationsOpen) {
    throw new MembershipError("applications_closed");
  }
  return type;
}

async function loadEnabledTracks(trackIds: string[]) {
  if (trackIds.length === 0) return [];
  const db = getDb();
  const rows = await db.query.tracks.findMany({
    where: and(inArray(tracks.id, trackIds), eq(tracks.isEnabled, true)),
  });
  if (rows.length !== trackIds.length) {
    throw new MembershipError("invalid_tracks");
  }
  return rows;
}

async function replaceApplicationTracks(
  applicationId: string,
  trackIds: string[],
  source: "applicant" | "reviewer",
) {
  const db = getDb();
  await db
    .delete(membershipApplicationTracks)
    .where(eq(membershipApplicationTracks.applicationId, applicationId));
  for (const trackId of trackIds) {
    await db.insert(membershipApplicationTracks).values({
      id: uuidv7(),
      applicationId,
      trackId,
      source,
    });
  }
}

async function writeReviewEvent(input: {
  applicationId: string;
  actorUserId: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  internalNotes?: string | null;
}) {
  const db = getDb();
  await db.insert(membershipApplicationReviews).values({
    id: uuidv7(),
    applicationId: input.applicationId,
    actorUserId: input.actorUserId,
    action: input.action,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    reason: input.reason ?? null,
    internalNotes: input.internalNotes ?? null,
  });
}

async function getApplicationOrThrow(applicationId: string) {
  const db = getDb();
  const row = await db.query.membershipApplications.findFirst({
    where: eq(membershipApplications.id, applicationId),
  });
  if (!row) {
    throw new MembershipError("application_not_found");
  }
  return row;
}

export async function createApplication(input: {
  actorUserId: string;
  data: ApplicationDraftInput;
  submit?: boolean;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "membership.application.create");
  await assertEligibleMembershipType(input.data.membershipTypeId);
  await loadEnabledTracks(input.data.trackIds);

  const db = getDb();
  const open = await db.query.membershipApplications.findFirst({
    where: and(
      eq(membershipApplications.userId, input.actorUserId),
      eq(membershipApplications.membershipTypeId, input.data.membershipTypeId),
      inArray(membershipApplications.status, [...OPEN_APPLICATION_STATUSES]),
    ),
  });
  if (open) {
    throw new MembershipError("open_application_exists");
  }

  const activeSameType = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, input.actorUserId),
      eq(memberships.membershipTypeId, input.data.membershipTypeId),
      eq(memberships.status, "active"),
    ),
  });
  if (activeSameType) {
    throw new MembershipError("active_membership_exists");
  }

  const id = uuidv7();
  const now = new Date();
  const status: ApplicationStatus = input.submit ? "submitted" : "draft";

  await db.insert(membershipApplications).values({
    id,
    userId: input.actorUserId,
    membershipTypeId: input.data.membershipTypeId,
    status,
    headline: input.data.headline,
    summary: input.data.summary,
    motivation: input.data.motivation,
    experience: input.data.experience,
    linkedinUrl: input.data.linkedinUrl ?? null,
    portfolioUrl: input.data.portfolioUrl ?? null,
    githubUrl: input.data.githubUrl ?? null,
    additionalNotes: input.data.additionalNotes ?? null,
    submittedAt: input.submit ? now : null,
  });
  await replaceApplicationTracks(id, input.data.trackIds, "applicant");

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "MEMBERSHIP_APPLICATION_CREATED",
    resourceType: "membership_application",
    resourceId: id,
    requestId: input.requestId,
    after: { status, membershipTypeId: input.data.membershipTypeId },
  });
  if (input.submit) {
    await writeAudit({
      actorUserId: input.actorUserId,
      action: "MEMBERSHIP_APPLICATION_SUBMITTED",
      resourceType: "membership_application",
      resourceId: id,
      requestId: input.requestId,
    });
    const { notifyDomainEvent } = await import("@/modules/notifications");
    await notifyDomainEvent({
      eventType: "MEMBERSHIP_APPLICATION_SUBMITTED",
      recipientUserId: input.actorUserId,
      linkPath: "/account/membership",
      idempotencyKey: `membership-submitted:${id}`,
    });
  }
  return id;
}

export async function updateOwnApplication(input: {
  actorUserId: string;
  applicationId: string;
  data: Partial<ApplicationDraftInput>;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "membership.application.create");
  const app = await getApplicationOrThrow(input.applicationId);
  if (app.userId !== input.actorUserId) {
    await writeSecurityEvent({
      kind: "idor_blocked",
      userId: input.actorUserId,
      meta: { resource: "membership_application", id: input.applicationId },
    });
    throw new MembershipError("forbidden");
  }
  if (app.status !== "draft" && app.status !== "changes_requested") {
    throw new MembershipError("application_not_editable");
  }
  if (input.data.membershipTypeId) {
    await assertEligibleMembershipType(input.data.membershipTypeId);
  }
  if (input.data.trackIds) {
    await loadEnabledTracks(input.data.trackIds);
  }

  const db = getDb();
  await db
    .update(membershipApplications)
    .set({
      membershipTypeId: input.data.membershipTypeId ?? app.membershipTypeId,
      headline: input.data.headline ?? app.headline,
      summary: input.data.summary ?? app.summary,
      motivation: input.data.motivation ?? app.motivation,
      experience: input.data.experience ?? app.experience,
      linkedinUrl:
        input.data.linkedinUrl !== undefined
          ? (input.data.linkedinUrl ?? null)
          : app.linkedinUrl,
      portfolioUrl:
        input.data.portfolioUrl !== undefined
          ? (input.data.portfolioUrl ?? null)
          : app.portfolioUrl,
      githubUrl:
        input.data.githubUrl !== undefined ? (input.data.githubUrl ?? null) : app.githubUrl,
      additionalNotes:
        input.data.additionalNotes !== undefined
          ? (input.data.additionalNotes ?? null)
          : app.additionalNotes,
      updatedAt: new Date(),
    })
    .where(eq(membershipApplications.id, input.applicationId));

  if (input.data.trackIds) {
    await replaceApplicationTracks(input.applicationId, input.data.trackIds, "applicant");
  }

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "MEMBERSHIP_APPLICATION_UPDATED",
    resourceType: "membership_application",
    resourceId: input.applicationId,
    requestId: input.requestId,
  });
}

export async function submitOwnApplication(input: {
  actorUserId: string;
  applicationId: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "membership.application.create");
  const app = await getApplicationOrThrow(input.applicationId);
  if (app.userId !== input.actorUserId) {
    throw new MembershipError("forbidden");
  }
  const from = app.status as ApplicationStatus;
  const to: ApplicationStatus = "submitted";
  assertApplicationTransition(from, to);
  await assertEligibleMembershipType(app.membershipTypeId);

  const db = getDb();
  await db
    .update(membershipApplications)
    .set({ status: to, submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(membershipApplications.id, input.applicationId));
  await writeReviewEvent({
    applicationId: input.applicationId,
    actorUserId: input.actorUserId,
    action: "submit",
    fromStatus: from,
    toStatus: to,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "MEMBERSHIP_APPLICATION_SUBMITTED",
    resourceType: "membership_application",
    resourceId: input.applicationId,
    requestId: input.requestId,
  });
  const { notifyDomainEvent } = await import("@/modules/notifications");
  await notifyDomainEvent({
    eventType: "MEMBERSHIP_APPLICATION_SUBMITTED",
    recipientUserId: input.actorUserId,
    linkPath: "/account/membership",
    idempotencyKey: `membership-submitted:${input.applicationId}`,
  });
}

export async function withdrawOwnApplication(input: {
  actorUserId: string;
  applicationId: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "membership.application.withdraw.own");
  const app = await getApplicationOrThrow(input.applicationId);
  if (app.userId !== input.actorUserId) {
    throw new MembershipError("forbidden");
  }
  const from = app.status as ApplicationStatus;
  assertApplicationTransition(from, "withdrawn");
  const db = getDb();
  await db
    .update(membershipApplications)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(membershipApplications.id, input.applicationId));
  await writeReviewEvent({
    applicationId: input.applicationId,
    actorUserId: input.actorUserId,
    action: "withdraw",
    fromStatus: from,
    toStatus: "withdrawn",
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "MEMBERSHIP_APPLICATION_WITHDRAWN",
    resourceType: "membership_application",
    resourceId: input.applicationId,
    requestId: input.requestId,
  });
}

function mapMemberApplicationDto(
  app: typeof membershipApplications.$inferSelect,
  type: typeof membershipTypes.$inferSelect,
  trackRows: Array<typeof tracks.$inferSelect>,
  timeline: Array<{
    action: string;
    fromStatus: string;
    toStatus: string;
    reason: string | null;
    createdAt: Date;
  }>,
): MemberApplicationDto {
  return {
    id: app.id,
    status: app.status as ApplicationStatus,
    membershipType: {
      id: type.id,
      slug: type.slug,
      code: type.code,
      nameAr: type.nameAr,
      nameEn: type.nameEn,
    },
    tracks: trackRows.map((t) => ({
      id: t.id,
      slug: t.slug,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
    })),
    headline: app.headline,
    summary: app.summary,
    motivation: app.motivation,
    experience: app.experience,
    linkedinUrl: app.linkedinUrl,
    portfolioUrl: app.portfolioUrl,
    githubUrl: app.githubUrl,
    additionalNotes: app.additionalNotes,
    decisionReason: app.decisionReason,
    submittedAt: app.submittedAt?.toISOString() ?? null,
    decidedAt: app.decidedAt?.toISOString() ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    timeline: timeline.map((event) => ({
      action: event.action,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.reason,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

async function hydrateApplication(
  app: typeof membershipApplications.$inferSelect,
  includeInternal: boolean,
): Promise<MemberApplicationDto | AdminApplicationDto> {
  const db = getDb();
  const type = await db.query.membershipTypes.findFirst({
    where: eq(membershipTypes.id, app.membershipTypeId),
  });
  if (!type) {
    throw new MembershipError("membership_type_not_found");
  }
  const links = await db.query.membershipApplicationTracks.findMany({
    where: eq(membershipApplicationTracks.applicationId, app.id),
  });
  const trackRows =
    links.length === 0
      ? []
      : await db.query.tracks.findMany({
          where: inArray(
            tracks.id,
            links.map((l) => l.trackId),
          ),
        });
  const reviews = await db.query.membershipApplicationReviews.findMany({
    where: eq(membershipApplicationReviews.applicationId, app.id),
    orderBy: (fields, { asc }) => [asc(fields.createdAt)],
  });
  const base = mapMemberApplicationDto(
    app,
    type,
    trackRows,
    reviews.map((r) => ({
      action: r.action,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      reason: r.reason,
      createdAt: r.createdAt,
    })),
  );
  if (!includeInternal) {
    return base;
  }
  return {
    ...base,
    userId: app.userId,
    reviewerId: app.reviewerId,
    internalNotes: app.internalNotes,
  };
}

export async function getOwnApplicationDto(input: {
  actorUserId: string;
  applicationId: string;
}): Promise<MemberApplicationDto> {
  await requirePermission(input.actorUserId, "membership.application.read.own");
  const app = await getApplicationOrThrow(input.applicationId);
  if (app.userId !== input.actorUserId) {
    await writeSecurityEvent({
      kind: "idor_blocked",
      userId: input.actorUserId,
      meta: { resource: "membership_application", id: input.applicationId },
    });
    throw new MembershipError("forbidden");
  }
  return (await hydrateApplication(app, false)) as MemberApplicationDto;
}

export async function listOwnApplications(actorUserId: string): Promise<MemberApplicationDto[]> {
  await requirePermission(actorUserId, "membership.application.read.own");
  const db = getDb();
  const rows = await db.query.membershipApplications.findMany({
    where: eq(membershipApplications.userId, actorUserId),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
  });
  const out: MemberApplicationDto[] = [];
  for (const row of rows) {
    out.push((await hydrateApplication(row, false)) as MemberApplicationDto);
  }
  return out;
}

export async function getAdminApplicationDto(input: {
  actorUserId: string;
  applicationId: string;
}): Promise<AdminApplicationDto> {
  await requirePermission(input.actorUserId, "membership.application.read.any");
  const app = await getApplicationOrThrow(input.applicationId);
  return (await hydrateApplication(app, true)) as AdminApplicationDto;
}

export async function listApplicationsForAdmin(input: {
  actorUserId: string;
  status?: string;
  membershipTypeId?: string;
  trackId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission(input.actorUserId, "membership.application.read.any");
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const db = getDb();

  const conditions = [];
  if (input.status) {
    conditions.push(eq(membershipApplications.status, input.status));
  }
  if (input.membershipTypeId) {
    conditions.push(eq(membershipApplications.membershipTypeId, input.membershipTypeId));
  }

  let applicationIdsFilter: string[] | null = null;
  if (input.trackId) {
    const links = await db.query.membershipApplicationTracks.findMany({
      where: eq(membershipApplicationTracks.trackId, input.trackId),
    });
    applicationIdsFilter = links.map((l) => l.applicationId);
    if (applicationIdsFilter.length === 0) {
      return { items: [] as AdminApplicationDto[], total: 0, page, pageSize };
    }
    conditions.push(inArray(membershipApplications.id, applicationIdsFilter));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const totalRow = await db
    .select({ value: count() })
    .from(membershipApplications)
    .where(where);
  const total = Number(totalRow[0]?.value ?? 0);

  const rows = await db.query.membershipApplications.findMany({
    where,
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  let items = await Promise.all(
    rows.map(async (row) => (await hydrateApplication(row, true)) as AdminApplicationDto),
  );

  if (input.q?.trim()) {
    const needle = input.q.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.headline?.toLowerCase().includes(needle) ||
        item.membershipType.slug.includes(needle) ||
        item.id.toLowerCase().includes(needle),
    );
  }

  return { items, total, page, pageSize };
}

async function transitionApplication(input: {
  actor: Actor;
  applicationId: string;
  to: ApplicationStatus;
  action: string;
  auditAction: string;
  reason?: string | null;
  internalNotes?: string | null;
  requireReason?: boolean;
  trackIds?: string[];
  requestId?: string | null;
  permission: string;
}) {
  await requirePermission(input.actor.id, input.permission);
  const app = await getApplicationOrThrow(input.applicationId);
  assertCanReviewMembershipApplication(input.actor, { userId: app.userId });
  if (input.requireReason && !input.reason?.trim()) {
    throw new MembershipError("reason_required");
  }
  const from = app.status as ApplicationStatus;
  assertApplicationTransition(from, input.to);

  if (input.trackIds) {
    await loadEnabledTracks(input.trackIds);
    await replaceApplicationTracks(input.applicationId, input.trackIds, "reviewer");
    await writeAudit({
      actorUserId: input.actor.id,
      action: "MEMBERSHIP_APPLICATION_UPDATED",
      resourceType: "membership_application",
      resourceId: input.applicationId,
      requestId: input.requestId,
      after: { trackIds: input.trackIds, source: "reviewer" },
    });
  }

  const db = getDb();
  await db
    .update(membershipApplications)
    .set({
      status: input.to,
      reviewerId: input.actor.id,
      decisionReason: input.reason ?? app.decisionReason,
      internalNotes: input.internalNotes ?? app.internalNotes,
      decidedAt:
        input.to === "approved" || input.to === "rejected" ? new Date() : app.decidedAt,
      updatedAt: new Date(),
    })
    .where(eq(membershipApplications.id, input.applicationId));

  await writeReviewEvent({
    applicationId: input.applicationId,
    actorUserId: input.actor.id,
    action: input.action,
    fromStatus: from,
    toStatus: input.to,
    reason: input.reason,
    internalNotes: input.internalNotes,
  });

  await writeAudit({
    actorUserId: input.actor.id,
    action: input.auditAction,
    resourceType: "membership_application",
    resourceId: input.applicationId,
    requestId: input.requestId,
    reason: input.reason,
    after: { from, to: input.to },
  });

  if (input.to === "rejected" || input.to === "changes_requested") {
    const { notifyDomainEvent } = await import("@/modules/notifications");
    await notifyDomainEvent({
      eventType:
        input.to === "rejected" ? "MEMBERSHIP_REJECTED" : "MEMBERSHIP_CHANGES_REQUESTED",
      recipientUserId: app.userId,
      linkPath: "/account/membership",
      idempotencyKey: `membership-${input.to}:${input.applicationId}`,
    });
  }
}

export async function startReview(input: {
  actorUserId: string;
  applicationId: string;
  requestId?: string | null;
}) {
  const actor = await requirePermission(input.actorUserId, "membership.application.review");
  await transitionApplication({
    actor,
    applicationId: input.applicationId,
    to: "under_review",
    action: "start_review",
    auditAction: "MEMBERSHIP_REVIEW_STARTED",
    permission: "membership.application.review",
    requestId: input.requestId,
  });
}

export async function requestChanges(input: {
  actorUserId: string;
  applicationId: string;
  reason: string;
  internalNotes?: string | null;
  requestId?: string | null;
}) {
  const actor = await requirePermission(input.actorUserId, "membership.application.review");
  await transitionApplication({
    actor,
    applicationId: input.applicationId,
    to: "changes_requested",
    action: "request_changes",
    auditAction: "MEMBERSHIP_CHANGES_REQUESTED",
    reason: input.reason,
    internalNotes: input.internalNotes,
    requireReason: true,
    permission: "membership.application.review",
    requestId: input.requestId,
  });
}

export async function rejectApplication(input: {
  actorUserId: string;
  applicationId: string;
  reason: string;
  internalNotes?: string | null;
  requestId?: string | null;
}) {
  const actor = await requirePermission(input.actorUserId, "membership.application.reject");
  await transitionApplication({
    actor,
    applicationId: input.applicationId,
    to: "rejected",
    action: "reject",
    auditAction: "MEMBERSHIP_APPLICATION_REJECTED",
    reason: input.reason,
    internalNotes: input.internalNotes,
    requireReason: true,
    permission: "membership.application.reject",
    requestId: input.requestId,
  });
}

export async function assignReviewer(input: {
  actorUserId: string;
  applicationId: string;
  reviewerId: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "membership.application.assign");
  const app = await getApplicationOrThrow(input.applicationId);
  if (app.userId === input.reviewerId) {
    throw new MembershipError("cannot_assign_applicant");
  }
  const db = getDb();
  const reviewer = await db.query.users.findFirst({
    where: eq(users.id, input.reviewerId),
  });
  if (!reviewer || reviewer.status !== "active") {
    throw new MembershipError("reviewer_not_found");
  }
  await db
    .update(membershipApplications)
    .set({ reviewerId: input.reviewerId, updatedAt: new Date() })
    .where(eq(membershipApplications.id, input.applicationId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "MEMBERSHIP_APPLICATION_UPDATED",
    resourceType: "membership_application",
    resourceId: input.applicationId,
    requestId: input.requestId,
    after: { reviewerId: input.reviewerId },
  });
}

function computeEndsAt(
  type: typeof membershipTypes.$inferSelect,
  startsAt: Date,
): Date | null {
  if (type.validityMode === "lifetime") {
    return null;
  }
  const days =
    type.validityMode === "fixed_days" && type.validityDays && type.validityDays > 0
      ? type.validityDays
      : 365;
  return new Date(startsAt.getTime() + days * 86_400_000);
}

async function issueMembershipInTx(input: {
  userId: string;
  membershipTypeId: string;
  applicationId: string | null;
  trackIds: string[];
  issuedBy: string;
  issueReason: string | null;
  auditAction: "MEMBERSHIP_ISSUED" | "MEMBERSHIP_ISSUED_DIRECTLY";
  requestId?: string | null;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    if (input.applicationId) {
      await tx.execute(
        sql`select id from membership_applications where id = ${input.applicationId} for update`,
      );
      const [locked] = await tx
        .select()
        .from(membershipApplications)
        .where(eq(membershipApplications.id, input.applicationId));
      if (!locked) {
        throw new MembershipError("application_not_found");
      }
      if (locked.status === "approved") {
        const existing = await tx.query.memberships.findFirst({
          where: eq(memberships.applicationId, input.applicationId),
        });
        if (existing) {
          return existing.id;
        }
        throw new MembershipError("already_approved");
      }
      if (locked.status !== "under_review") {
        throw new MembershipError(`invalid_application_transition:${locked.status}->approved`);
      }
      if (locked.userId === input.issuedBy) {
        throw new MembershipError("self_approval_forbidden");
      }
    }

    const type = await tx.query.membershipTypes.findFirst({
      where: eq(membershipTypes.id, input.membershipTypeId),
    });
    if (!type || !type.isEnabled) {
      throw new MembershipError("membership_type_inactive");
    }

    const duplicate = await tx.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, input.userId),
        eq(memberships.membershipTypeId, input.membershipTypeId),
        eq(memberships.status, "active"),
      ),
    });
    if (duplicate) {
      throw new MembershipError("duplicate_active_membership");
    }

    const now = new Date();
    const membershipId = uuidv7();
    const endsAt = computeEndsAt(type, now);

    await tx.insert(memberships).values({
      id: membershipId,
      userId: input.userId,
      membershipTypeId: input.membershipTypeId,
      applicationId: input.applicationId,
      status: "active",
      isPrimary: true,
      issuedAt: now,
      startsAt: now,
      endsAt,
      issuedBy: input.issuedBy,
      issueReason: input.issueReason,
    });

    await tx.insert(membershipStatusHistory).values({
      id: uuidv7(),
      membershipId,
      fromStatus: "none",
      toStatus: "active",
      actorId: input.issuedBy,
      reason: input.issueReason,
    });

    for (const trackId of input.trackIds) {
      await tx.insert(memberTracks).values({
        id: uuidv7(),
        membershipId,
        trackId,
        isPrimary: false,
      });
    }

    if (input.applicationId) {
      await tx
        .update(membershipApplications)
        .set({
          status: "approved",
          reviewerId: input.issuedBy,
          decidedAt: now,
          updatedAt: now,
        })
        .where(eq(membershipApplications.id, input.applicationId));

      await tx.insert(membershipApplicationReviews).values({
        id: uuidv7(),
        applicationId: input.applicationId,
        actorUserId: input.issuedBy,
        action: "approve",
        fromStatus: "under_review",
        toStatus: "approved",
        reason: input.issueReason,
      });
    }

    await writeAudit({
      actorUserId: input.issuedBy,
      action: input.auditAction,
      resourceType: "membership",
      resourceId: membershipId,
      requestId: input.requestId,
      reason: input.issueReason,
      after: {
        userId: input.userId,
        membershipTypeId: input.membershipTypeId,
        applicationId: input.applicationId,
        trackCount: input.trackIds.length,
      },
    });

    if (input.applicationId) {
      await writeAudit({
        actorUserId: input.issuedBy,
        action: "MEMBERSHIP_APPLICATION_APPROVED",
        resourceType: "membership_application",
        resourceId: input.applicationId,
        requestId: input.requestId,
      });
    }

    return membershipId;
  }).then(async (membershipId) => {
    const { issueCredentialForMembership } = await import("@/modules/credentials/service");
    await issueCredentialForMembership({
      membershipId,
      actorUserId: input.issuedBy,
      issuanceSource: input.auditAction,
      requestId: input.requestId,
    });
    if (input.applicationId) {
      const { notifyDomainEvent } = await import("@/modules/notifications");
      await notifyDomainEvent({
        eventType: "MEMBERSHIP_APPROVED",
        recipientUserId: input.userId,
        linkPath: "/account/credential",
        idempotencyKey: `membership-approved:${input.applicationId}`,
      });
    }
    return membershipId;
  });
}

export async function approveApplication(input: {
  actorUserId: string;
  applicationId: string;
  reason?: string | null;
  internalNotes?: string | null;
  trackIds?: string[];
  requestId?: string | null;
}) {
  const actor = await requirePermission(input.actorUserId, "membership.application.approve");
  const app = await getApplicationOrThrow(input.applicationId);
  const type = await getDb().query.membershipTypes.findFirst({
    where: eq(membershipTypes.id, app.membershipTypeId),
  });
  if (type && ELEVATED_APPROVAL_SLUGS.has(type.slug)) {
    await requirePermission(input.actorUserId, "membership.issue");
  }
  assertCanApproveMembershipApplication(actor, { userId: app.userId });
  assertNotSelfApplicationReview(actor, { userId: app.userId });

  let trackIds = input.trackIds;
  if (!trackIds) {
    const db = getDb();
    const links = await db.query.membershipApplicationTracks.findMany({
      where: eq(membershipApplicationTracks.applicationId, input.applicationId),
    });
    trackIds = links.map((l) => l.trackId);
  } else {
    await loadEnabledTracks(trackIds);
    await replaceApplicationTracks(input.applicationId, trackIds, "reviewer");
  }

  if (input.internalNotes) {
    const db = getDb();
    await db
      .update(membershipApplications)
      .set({ internalNotes: input.internalNotes, updatedAt: new Date() })
      .where(eq(membershipApplications.id, input.applicationId));
  }

  return issueMembershipInTx({
    userId: app.userId,
    membershipTypeId: app.membershipTypeId,
    applicationId: app.id,
    trackIds,
    issuedBy: input.actorUserId,
    issueReason: input.reason ?? null,
    auditAction: "MEMBERSHIP_ISSUED",
    requestId: input.requestId,
  });
}

export async function issueMembershipDirectly(input: {
  actorUserId: string;
  targetUserId: string;
  membershipTypeId: string;
  trackIds: string[];
  reason: string;
  requestId?: string | null;
}) {
  const actor = await requirePermission(input.actorUserId, "membership.issue");
  assertCanIssueMembership(actor);
  if (!input.reason.trim()) {
    throw new MembershipError("reason_required");
  }
  const db = getDb();
  const target = await db.query.users.findFirst({
    where: eq(users.id, input.targetUserId),
  });
  if (!target || target.status !== "active") {
    throw new MembershipError("target_user_not_found");
  }
  const type = await db.query.membershipTypes.findFirst({
    where: eq(membershipTypes.id, input.membershipTypeId),
  });
  if (!type || !type.isEnabled) {
    throw new MembershipError("membership_type_inactive");
  }
  await loadEnabledTracks(input.trackIds);

  return issueMembershipInTx({
    userId: input.targetUserId,
    membershipTypeId: input.membershipTypeId,
    applicationId: null,
    trackIds: input.trackIds,
    issuedBy: input.actorUserId,
    issueReason: input.reason,
    auditAction: "MEMBERSHIP_ISSUED_DIRECTLY",
    requestId: input.requestId,
  });
}

async function changeMembershipStatus(input: {
  actorUserId: string;
  membershipId: string;
  to: MembershipStatus;
  reason: string;
  permission: string;
  auditAction: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, input.permission);
  if (!input.reason.trim()) {
    throw new MembershipError("reason_required");
  }
  const db = getDb();
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.id, input.membershipId),
  });
  if (!membership) {
    throw new MembershipError("membership_not_found");
  }
  const from = membership.status as MembershipStatus;
  if (from === input.to) {
    throw new MembershipError("status_unchanged");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(memberships)
      .set({ status: input.to, updatedAt: new Date() })
      .where(eq(memberships.id, input.membershipId));
    await tx.insert(membershipStatusHistory).values({
      id: uuidv7(),
      membershipId: input.membershipId,
      fromStatus: from,
      toStatus: input.to,
      actorId: input.actorUserId,
      reason: input.reason,
    });
  });

  await writeAudit({
    actorUserId: input.actorUserId,
    action: input.auditAction,
    resourceType: "membership",
    resourceId: input.membershipId,
    requestId: input.requestId,
    reason: input.reason,
    before: { status: from },
    after: { status: input.to },
  });

  if (input.to === "suspended" || input.to === "revoked" || input.to === "expired") {
    const { suspendTrackPrivilegesForUser } = await import("@/modules/tracks");
    await suspendTrackPrivilegesForUser({
      userId: membership.userId,
      reason: `membership_${input.to}`,
      requestId: input.requestId,
    });
  }

  const { syncCredentialWithMembership } = await import("@/modules/credentials/service");
  await syncCredentialWithMembership({
    membershipId: input.membershipId,
    actorUserId: input.actorUserId,
    reason: input.reason,
    source: input.auditAction,
  });

  if (input.to === "suspended") {
    const { notifyDomainEvent } = await import("@/modules/notifications");
    await notifyDomainEvent({
      eventType: "MEMBERSHIP_SUSPENDED",
      recipientUserId: membership.userId,
      linkPath: "/account/membership",
      idempotencyKey: `membership-suspended:${input.membershipId}:${from}:suspended`,
    });
  }
}

export async function suspendMembership(input: {
  actorUserId: string;
  membershipId: string;
  reason: string;
  requestId?: string | null;
}) {
  await changeMembershipStatus({
    ...input,
    to: "suspended",
    permission: "membership.suspend",
    auditAction: "MEMBERSHIP_SUSPENDED",
  });
}

export async function reactivateMembership(input: {
  actorUserId: string;
  membershipId: string;
  reason: string;
  requestId?: string | null;
}) {
  const db = getDb();
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.id, input.membershipId),
  });
  if (!membership) {
    throw new MembershipError("membership_not_found");
  }
  const duplicate = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, membership.userId),
      eq(memberships.membershipTypeId, membership.membershipTypeId),
      eq(memberships.status, "active"),
    ),
  });
  if (duplicate && duplicate.id !== membership.id) {
    throw new MembershipError("duplicate_active_membership");
  }
  await changeMembershipStatus({
    ...input,
    to: "active",
    permission: "membership.issue",
    auditAction: "MEMBERSHIP_REACTIVATED",
  });
}

export async function revokeMembership(input: {
  actorUserId: string;
  membershipId: string;
  reason: string;
  requestId?: string | null;
}) {
  await changeMembershipStatus({
    ...input,
    to: "revoked",
    permission: "membership.revoke",
    auditAction: "MEMBERSHIP_REVOKED",
  });
}

export async function listOwnMemberships(actorUserId: string): Promise<MemberMembershipDto[]> {
  await requirePermission(actorUserId, "membership.read.own");
  const db = getDb();
  const rows = await db.query.memberships.findMany({
    where: eq(memberships.userId, actorUserId),
    orderBy: (fields, { desc }) => [desc(fields.issuedAt)],
  });
  const out: MemberMembershipDto[] = [];
  for (const row of rows) {
    const type = await db.query.membershipTypes.findFirst({
      where: eq(membershipTypes.id, row.membershipTypeId),
    });
    if (!type) continue;
    const links = await db.query.memberTracks.findMany({
      where: eq(memberTracks.membershipId, row.id),
    });
    const trackRows =
      links.length === 0
        ? []
        : await db.query.tracks.findMany({
            where: inArray(
              tracks.id,
              links.map((l) => l.trackId),
            ),
          });
    out.push({
      id: row.id,
      status: row.status as MembershipStatus,
      membershipType: {
        id: type.id,
        slug: type.slug,
        code: type.code,
        nameAr: type.nameAr,
        nameEn: type.nameEn,
      },
      tracks: trackRows.map((t) => ({
        id: t.id,
        slug: t.slug,
        nameAr: t.nameAr,
        nameEn: t.nameEn,
      })),
      issuedAt: row.issuedAt.toISOString(),
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt?.toISOString() ?? null,
      sourceApplicationId: row.applicationId,
    });
  }
  return out;
}

export async function getMembershipMetrics(actorUserId: string) {
  await requirePermission(actorUserId, "membership.read.any");
  const db = getDb();

  async function countApps(status: string) {
    const row = await db
      .select({ value: count() })
      .from(membershipApplications)
      .where(eq(membershipApplications.status, status));
    return Number(row[0]?.value ?? 0);
  }

  const activeMemberships = await db
    .select({ value: count() })
    .from(memberships)
    .where(eq(memberships.status, "active"));

  const types = await db.query.membershipTypes.findMany();
  const typeDistribution: Array<{
    slug: string;
    nameAr: string;
    nameEn: string;
    activeCount: number;
  }> = [];
  for (const type of types) {
    const row = await db
      .select({ value: count() })
      .from(memberships)
      .where(
        and(eq(memberships.membershipTypeId, type.id), eq(memberships.status, "active")),
      );
    typeDistribution.push({
      slug: type.slug,
      nameAr: type.nameAr,
      nameEn: type.nameEn,
      activeCount: Number(row[0]?.value ?? 0),
    });
  }

  const founding = typeDistribution.find((t) => t.slug === "founding_member")?.activeCount ?? 0;
  const volunteers = typeDistribution
    .filter((t) => t.slug.includes("volunteer"))
    .reduce((sum, t) => sum + t.activeCount, 0);

  return {
    applicationsSubmitted: await countApps("submitted"),
    underReview: await countApps("under_review"),
    changesRequested: await countApps("changes_requested"),
    approved: await countApps("approved"),
    rejected: await countApps("rejected"),
    activeMemberships: Number(activeMemberships[0]?.value ?? 0),
    foundingMembers: founding,
    volunteerMemberships: volunteers,
    typeDistribution,
  };
}

export async function listMembershipsForAdmin(input: {
  actorUserId: string;
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  await requirePermission(input.actorUserId, "membership.read.any");
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const db = getDb();
  const where = input.status ? eq(memberships.status, input.status) : undefined;
  const totalRow = await db.select({ value: count() }).from(memberships).where(where);
  const rows = await db.query.memberships.findMany({
    where,
    orderBy: (fields, { desc }) => [desc(fields.issuedAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return {
    items: rows,
    total: Number(totalRow[0]?.value ?? 0),
    page,
    pageSize,
  };
}

export { isOpenStatus, toMembershipTypeDto, toTrackDto };
