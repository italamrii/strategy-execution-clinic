import { and, count, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { calculateImpactScore } from "@/modules/community/impact-score";
import {
  assertCanReviewHours,
  buildActor,
  requirePermission,
} from "@/modules/identity";
import { assertNotSelfApplicationReview } from "@/shared/security/authorization";
import { AuthorizationError } from "@/shared/security/authorization";
import { getDb } from "@/shared/db/client";
import {
  impactEvents,
  impactRules,
  memberships,
  membershipTypes,
  profiles,
  volunteerAttendance,
  volunteerHourAdjustments,
  volunteerHourEntries,
  volunteerLevelHistory,
  volunteerOpportunities,
  volunteerOpportunityApplications,
  volunteerParticipations,
  volunteerProfiles,
  volunteerProgressionRules,
} from "@/shared/db/schema";
import { IMPACT_RULE_SEEDS, PROGRESSION_RULE_SEEDS } from "./catalog";
import { isEligibleMembershipSlug } from "./eligibility";
import { VolunteerError } from "./errors";
import { recomputeApprovedHours, recomputePendingHours } from "./ledger";
import type {
  AttendanceStatus,
  OpportunityStatus,
  ParticipationStatus,
  ProgressionLevel,
  VolunteerApplicationStatus,
  VolunteerProfileStatus,
} from "./states";
import {
  assertApplicationTransition,
  assertOpportunityTransition,
  MANUAL_APPROVAL_LEVELS,
  PROGRESSION_LEVELS,
} from "./states";
import { applyHourDecision } from "./hours";
import {
  requireVolunteerApplicationScope,
  requireVolunteerHourScope,
  requireVolunteerOpportunityScope,
  requireVolunteerParticipationScope,
  scopedOpportunityIdsForActor,
} from "./scope";

// ─── Seeds ───────────────────────────────────────────────────────────────────

export async function seedVolunteerCatalog() {
  const db = getDb();
  for (const rule of IMPACT_RULE_SEEDS) {
    const existing = await db.query.impactRules.findFirst({
      where: eq(impactRules.eventKind, rule.eventKind),
    });
    if (!existing) {
      await db.insert(impactRules).values({
        id: uuidv7(),
        eventKind: rule.eventKind,
        weight: String(rule.weight),
        isEnabled: rule.isEnabled,
      });
    }
  }
  for (const seed of PROGRESSION_RULE_SEEDS) {
    const existing = await db.query.volunteerProgressionRules.findFirst({
      where: eq(volunteerProgressionRules.slug, seed.slug),
    });
    if (!existing) {
      await db.insert(volunteerProgressionRules).values({
        id: uuidv7(),
        slug: seed.slug,
        nameAr: seed.nameAr,
        nameEn: seed.nameEn,
        predicate: seed.predicate,
        isEnabled: true,
      });
    }
  }
}

// ─── Eligibility ─────────────────────────────────────────────────────────────

export async function assertEligibleVolunteerMembership(userId: string) {
  const db = getDb();
  const rows = await db
    .select({ slug: membershipTypes.slug, status: memberships.status })
    .from(memberships)
    .innerJoin(membershipTypes, eq(memberships.membershipTypeId, membershipTypes.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")));
  const eligible = rows.find((r) => isEligibleMembershipSlug(r.slug));
  if (!eligible) {
    throw new VolunteerError("ineligible_membership");
  }
  return eligible;
}

async function getProfileByUserId(userId: string) {
  const db = getDb();
  return db.query.volunteerProfiles.findFirst({
    where: eq(volunteerProfiles.userId, userId),
  });
}

async function getProfileOrThrow(userId: string) {
  const profile = await getProfileByUserId(userId);
  if (!profile) {
    throw new VolunteerError("volunteer_profile_missing");
  }
  if (profile.status !== "active") {
    throw new VolunteerError("volunteer_profile_inactive");
  }
  return profile;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function activateVolunteerProfile(input: {
  actorUserId: string;
  availability?: string;
  skills?: string[];
  interests?: string[];
  locationPreference?: string;
  city?: string;
  preferredTrackIds?: string[];
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "volunteer.profile.update.own");
  await assertEligibleVolunteerMembership(input.actorUserId);
  const db = getDb();
  const existing = await getProfileByUserId(input.actorUserId);
  if (existing && existing.status === "active") {
    throw new VolunteerError("profile_already_active");
  }
  const now = new Date();
  const id = existing?.id ?? uuidv7();
  if (existing) {
    await db
      .update(volunteerProfiles)
      .set({
        status: "active",
        availability: input.availability ?? existing.availability,
        skills: input.skills ?? existing.skills,
        interests: input.interests ?? existing.interests,
        locationPreference: input.locationPreference ?? existing.locationPreference,
        city: input.city ?? existing.city,
        preferredTracks: input.preferredTrackIds ?? existing.preferredTracks,
        updatedAt: now,
      })
      .where(eq(volunteerProfiles.id, id));
  } else {
    await db.insert(volunteerProfiles).values({
      id,
      userId: input.actorUserId,
      status: "active",
      joinedAt: now,
      availability: input.availability ?? null,
      skills: input.skills ?? null,
      interests: input.interests ?? null,
      locationPreference: input.locationPreference ?? null,
      city: input.city ?? null,
      preferredTracks: input.preferredTrackIds ?? null,
      progressionLevel: "volunteer",
    });
  }
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "VOLUNTEER_PROFILE_ACTIVATED",
    resourceType: "volunteer_profile",
    resourceId: id,
    requestId: input.requestId,
  });
  return id;
}

export async function updateOwnVolunteerProfile(input: {
  actorUserId: string;
  availability?: string;
  skills?: string[];
  interests?: string[];
  locationPreference?: string;
  city?: string;
  preferredTrackIds?: string[];
}) {
  await requirePermission(input.actorUserId, "volunteer.profile.update.own");
  const profile = await getProfileOrThrow(input.actorUserId);
  const db = getDb();
  await db
    .update(volunteerProfiles)
    .set({
      availability: input.availability ?? profile.availability,
      skills: input.skills ?? profile.skills,
      interests: input.interests ?? profile.interests,
      locationPreference: input.locationPreference ?? profile.locationPreference,
      city: input.city ?? profile.city,
      preferredTracks: input.preferredTrackIds ?? profile.preferredTracks,
      updatedAt: new Date(),
    })
    .where(eq(volunteerProfiles.id, profile.id));
  return profile.id;
}

// ─── Opportunities ───────────────────────────────────────────────────────────

export async function createOpportunity(input: {
  actorUserId: string;
  data: {
    titleAr: string;
    titleEn: string;
    descriptionAr?: string;
    descriptionEn?: string;
    trackId?: string;
    requiredSkills?: string[];
    locationType: string;
    locationTextAr?: string;
    locationTextEn?: string;
    city?: string;
    startsAt?: string;
    endsAt?: string;
    applicationDeadline?: string;
    maxParticipants?: number;
    expectedHours?: number;
    visibility: string;
  };
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "volunteer.opportunity.create");
  const id = uuidv7();
  const db = getDb();
  await db.insert(volunteerOpportunities).values({
    id,
    titleAr: input.data.titleAr,
    titleEn: input.data.titleEn,
    descriptionAr: input.data.descriptionAr ?? null,
    descriptionEn: input.data.descriptionEn ?? null,
    trackId: input.data.trackId ?? null,
    requiredSkills: input.data.requiredSkills ?? null,
    locationType: input.data.locationType,
    locationTextAr: input.data.locationTextAr ?? null,
    locationTextEn: input.data.locationTextEn ?? null,
    city: input.data.city ?? null,
    startsAt: input.data.startsAt ? new Date(input.data.startsAt) : null,
    endsAt: input.data.endsAt ? new Date(input.data.endsAt) : null,
    applicationDeadline: input.data.applicationDeadline
      ? new Date(input.data.applicationDeadline)
      : null,
    maxParticipants: input.data.maxParticipants ?? null,
    expectedHours: input.data.expectedHours != null ? String(input.data.expectedHours) : null,
    organizerUserId: input.actorUserId,
    status: "draft",
    visibility: input.data.visibility,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "VOLUNTEER_OPPORTUNITY_CREATED",
    resourceType: "volunteer_opportunity",
    resourceId: id,
    requestId: input.requestId,
  });
  return id;
}

export async function transitionOpportunity(input: {
  actorUserId: string;
  opportunityId: string;
  toStatus: OpportunityStatus;
  requestId?: string | null;
}) {
  await requireVolunteerOpportunityScope({
    actorUserId: input.actorUserId,
    opportunityId: input.opportunityId,
    permission: "volunteer.opportunity.manage",
  });
  const db = getDb();
  const opp = await db.query.volunteerOpportunities.findFirst({
    where: eq(volunteerOpportunities.id, input.opportunityId),
  });
  if (!opp) throw new VolunteerError("opportunity_not_found");
  assertOpportunityTransition(opp.status as OpportunityStatus, input.toStatus);
  await db
    .update(volunteerOpportunities)
    .set({ status: input.toStatus, updatedAt: new Date() })
    .where(eq(volunteerOpportunities.id, input.opportunityId));
  const action =
    input.toStatus === "published"
      ? "VOLUNTEER_OPPORTUNITY_PUBLISHED"
      : input.toStatus === "cancelled"
        ? "VOLUNTEER_OPPORTUNITY_CANCELLED"
        : "VOLUNTEER_OPPORTUNITY_UPDATED";
  await writeAudit({
    actorUserId: input.actorUserId,
    action,
    resourceType: "volunteer_opportunity",
    resourceId: input.opportunityId,
    before: { status: opp.status },
    after: { status: input.toStatus },
    requestId: input.requestId,
  });
}

export async function listPublicOpportunities(input: {
  trackId?: string;
  locationType?: string;
  status?: string;
  skill?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 12));
  const db = getDb();
  const status = input.status ?? "published";
  const rows = await db.query.volunteerOpportunities.findMany({
    where: and(
      eq(volunteerOpportunities.status, status),
      eq(volunteerOpportunities.visibility, "public"),
      input.trackId ? eq(volunteerOpportunities.trackId, input.trackId) : undefined,
      input.locationType
        ? eq(volunteerOpportunities.locationType, input.locationType)
        : undefined,
    ),
    orderBy: (f, { desc: d }) => [d(f.startsAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  let items = rows;
  if (input.skill) {
    const needle = input.skill.toLowerCase();
    items = rows.filter((r) => {
      const skills = (r.requiredSkills as string[] | null) ?? [];
      return skills.some((s) => s.toLowerCase().includes(needle));
    });
  }
  return { items, page, pageSize };
}

export async function getOpportunityById(opportunityId: string) {
  const db = getDb();
  return db.query.volunteerOpportunities.findFirst({
    where: eq(volunteerOpportunities.id, opportunityId),
  });
}

// ─── Applications ────────────────────────────────────────────────────────────

export async function applyToOpportunity(input: {
  actorUserId: string;
  opportunityId: string;
  motivation: string;
  relevantExperience?: string;
  availabilityNote?: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "volunteer.application.create");
  await getProfileOrThrow(input.actorUserId);
  const db = getDb();
  const opp = await db.query.volunteerOpportunities.findFirst({
    where: eq(volunteerOpportunities.id, input.opportunityId),
  });
  if (!opp || opp.status !== "published") {
    throw new VolunteerError("opportunity_not_open");
  }
  if (opp.applicationDeadline && opp.applicationDeadline < new Date()) {
    throw new VolunteerError("application_deadline_passed");
  }
  const existing = await db.query.volunteerOpportunityApplications.findFirst({
    where: and(
      eq(volunteerOpportunityApplications.opportunityId, input.opportunityId),
      eq(volunteerOpportunityApplications.userId, input.actorUserId),
    ),
  });
  if (existing) {
    throw new VolunteerError("duplicate_application");
  }
  const id = uuidv7();
  const now = new Date();
  await db.insert(volunteerOpportunityApplications).values({
    id,
    opportunityId: input.opportunityId,
    userId: input.actorUserId,
    status: "submitted",
    motivation: input.motivation,
    relevantExperience: input.relevantExperience ?? null,
    availabilityNote: input.availabilityNote ?? null,
    submittedAt: now,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "VOLUNTEER_APPLICATION_SUBMITTED",
    resourceType: "volunteer_application",
    resourceId: id,
    requestId: input.requestId,
  });
  return id;
}

export async function withdrawApplication(input: {
  actorUserId: string;
  applicationId: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "volunteer.application.withdraw.own");
  const db = getDb();
  const app = await db.query.volunteerOpportunityApplications.findFirst({
    where: eq(volunteerOpportunityApplications.id, input.applicationId),
  });
  if (!app || app.userId !== input.actorUserId) {
    throw new VolunteerError("application_not_found");
  }
  assertApplicationTransition(app.status as VolunteerApplicationStatus, "withdrawn");
  await db
    .update(volunteerOpportunityApplications)
    .set({ status: "withdrawn", decidedAt: new Date() })
    .where(eq(volunteerOpportunityApplications.id, input.applicationId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "VOLUNTEER_APPLICATION_WITHDRAWN",
    resourceType: "volunteer_application",
    resourceId: input.applicationId,
    requestId: input.requestId,
  });
}

async function countAcceptedParticipants(
  opportunityId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any,
) {
  const db = tx ?? getDb();
  const [row] = await db
    .select({ total: count() })
    .from(volunteerParticipations)
    .where(
      and(
        eq(volunteerParticipations.opportunityId, opportunityId),
        inArray(volunteerParticipations.status, ["accepted", "active", "completed"]),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function reviewApplication(input: {
  actorUserId: string;
  applicationId: string;
  decision: "accepted" | "rejected" | "waitlisted";
  requestId?: string | null;
}) {
  const { application: app } = await requireVolunteerApplicationScope({
    actorUserId: input.actorUserId,
    applicationId: input.applicationId,
    permission: "volunteer.application.review",
  });
  const db = getDb();
  const actor = await buildActor(input.actorUserId);
  assertNotSelfApplicationReview(actor, { userId: app.userId });

  const toStatus: VolunteerApplicationStatus =
    input.decision === "accepted"
      ? "accepted"
      : input.decision === "rejected"
        ? "rejected"
        : "waitlisted";

  if (app.status === "submitted") {
    assertApplicationTransition("submitted", "under_review");
    await db
      .update(volunteerOpportunityApplications)
      .set({ status: "under_review" })
      .where(eq(volunteerOpportunityApplications.id, input.applicationId));
  }

  const current = await db.query.volunteerOpportunityApplications.findFirst({
    where: eq(volunteerOpportunityApplications.id, input.applicationId),
  });
  assertApplicationTransition(current!.status as VolunteerApplicationStatus, toStatus);

  if (input.decision === "accepted") {
    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(volunteerOpportunities)
        .where(eq(volunteerOpportunities.id, app.opportunityId))
        .for("update");
      if (!locked) throw new VolunteerError("opportunity_not_found");
      if (locked.maxParticipants != null) {
        const accepted = await countAcceptedParticipants(app.opportunityId, tx);
        if (accepted >= locked.maxParticipants) {
          throw new VolunteerError("capacity_full");
        }
      }
      await tx
        .update(volunteerOpportunityApplications)
        .set({
          status: "accepted",
          reviewerId: input.actorUserId,
          decidedAt: new Date(),
        })
        .where(eq(volunteerOpportunityApplications.id, input.applicationId));

      const profile = await tx.query.volunteerProfiles.findFirst({
        where: eq(volunteerProfiles.userId, app.userId),
      });
      if (!profile) throw new VolunteerError("volunteer_profile_missing");

      const participationId = uuidv7();
      const now = new Date();
      await tx.insert(volunteerParticipations).values({
        id: participationId,
        opportunityId: app.opportunityId,
        volunteerProfileId: profile.id,
        userId: app.userId,
        status: "accepted",
        acceptedAt: now,
        organizerUserId: locked.organizerUserId,
        attendanceStatus: "pending",
      });
      await writeAudit({
        actorUserId: input.actorUserId,
        action: "VOLUNTEER_APPLICATION_ACCEPTED",
        resourceType: "volunteer_application",
        resourceId: input.applicationId,
        requestId: input.requestId,
      });
      await writeAudit({
        actorUserId: input.actorUserId,
        action: "VOLUNTEER_PARTICIPATION_STARTED",
        resourceType: "volunteer_participation",
        resourceId: participationId,
        requestId: input.requestId,
      });
    });
  } else {
    await db
      .update(volunteerOpportunityApplications)
      .set({
        status: toStatus,
        reviewerId: input.actorUserId,
        decidedAt: new Date(),
      })
      .where(eq(volunteerOpportunityApplications.id, input.applicationId));
    await writeAudit({
      actorUserId: input.actorUserId,
      action:
        input.decision === "rejected"
          ? "VOLUNTEER_APPLICATION_REJECTED"
          : "VOLUNTEER_APPLICATION_UPDATED",
      resourceType: "volunteer_application",
      resourceId: input.applicationId,
      requestId: input.requestId,
    });
  }

  if (input.decision === "accepted" || input.decision === "rejected") {
    const { notifyDomainEvent } = await import("@/modules/notifications");
    await notifyDomainEvent({
      eventType:
        input.decision === "accepted"
          ? "VOLUNTEER_APPLICATION_ACCEPTED"
          : "VOLUNTEER_APPLICATION_REJECTED",
      recipientUserId: app.userId,
      linkPath: "/account/volunteer",
      idempotencyKey: `volunteer-application-${input.decision}:${input.applicationId}`,
    });
  }
}

// ─── Participation & Attendance ──────────────────────────────────────────────

export async function recordAttendance(input: {
  actorUserId: string;
  participationId: string;
  status: AttendanceStatus;
  notes?: string;
  requestId?: string | null;
}) {
  const { participation } = await requireVolunteerParticipationScope({
    actorUserId: input.actorUserId,
    participationId: input.participationId,
    permission: "volunteer.attendance.record",
  });
  const db = getDb();
  if (participation.userId === input.actorUserId) {
    throw new AuthorizationError("volunteer cannot self-mark attendance");
  }
  const id = uuidv7();
  await db.insert(volunteerAttendance).values({
    id,
    participationId: input.participationId,
    status: input.status,
    recordedBy: input.actorUserId,
    notes: input.notes ?? null,
  });
  await db
    .update(volunteerParticipations)
    .set({
      attendanceStatus: input.status,
      status: input.status === "attended" || input.status === "partial" ? "active" : participation.status,
      startedAt: participation.startedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(volunteerParticipations.id, input.participationId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "VOLUNTEER_ATTENDANCE_RECORDED",
    resourceType: "volunteer_attendance",
    resourceId: id,
    requestId: input.requestId,
  });
}

// ─── Hours ───────────────────────────────────────────────────────────────────

async function refreshProfileHourCaches(userId: string) {
  const db = getDb();
  const approved = await recomputeApprovedHours(userId);
  const pending = await recomputePendingHours(userId);
  await db
    .update(volunteerProfiles)
    .set({
      approvedHoursCache: String(approved),
      pendingHoursCache: String(pending),
      updatedAt: new Date(),
    })
    .where(eq(volunteerProfiles.userId, userId));
  return { approved, pending };
}

export async function submitVolunteerHours(input: {
  actorUserId: string;
  opportunityId?: string;
  participationId?: string;
  hours: number;
  activityDate: string;
  description: string;
  evidenceMediaId?: string;
  source?: "volunteer_submission" | "organizer_submission";
  targetUserId?: string;
  requestId?: string | null;
}) {
  const source = input.source ?? "volunteer_submission";
  const targetUserId = input.targetUserId ?? input.actorUserId;

  if (source === "volunteer_submission") {
    await requirePermission(input.actorUserId, "volunteer.hours.create.own");
    await getProfileOrThrow(input.actorUserId);
    if (targetUserId !== input.actorUserId) {
      throw new VolunteerError("cannot_submit_for_other");
    }
  } else {
    await requirePermission(input.actorUserId, "volunteer.participation.manage");
    if (input.opportunityId) {
      await requireVolunteerOpportunityScope({
        actorUserId: input.actorUserId,
        opportunityId: input.opportunityId,
        permission: "volunteer.participation.manage",
      });
    }
  }

  const id = uuidv7();
  const db = getDb();
  await db.insert(volunteerHourEntries).values({
    id,
    userId: targetUserId,
    opportunityId: input.opportunityId ?? null,
    participationId: input.participationId ?? null,
    hours: String(input.hours),
    activityDate: input.activityDate,
    description: input.description,
    status: "pending",
    source,
    submittedBy: input.actorUserId,
    evidenceMediaId: input.evidenceMediaId ?? null,
  });
  await refreshProfileHourCaches(targetUserId);
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "VOLUNTEER_HOURS_SUBMITTED",
    resourceType: "volunteer_hour_entry",
    resourceId: id,
    requestId: input.requestId,
  });
  return id;
}

export async function reviewVolunteerHours(input: {
  actorUserId: string;
  entryId: string;
  decision: "approved" | "rejected";
  reviewNotes?: string;
  requestId?: string | null;
}) {
  const { entry } = await requireVolunteerHourScope({
    actorUserId: input.actorUserId,
    entryId: input.entryId,
    permission: "volunteer.hours.review",
  });
  const db = getDb();
  const actor = await buildActor(input.actorUserId);
  assertCanReviewHours(actor, { userId: entry.userId });

  if (entry.status !== "pending") {
    throw new VolunteerError("hour_entry_already_decided");
  }

  applyHourDecision({
    currentStatus: "pending",
    nextStatus: input.decision,
  });

  await db
    .update(volunteerHourEntries)
    .set({
      status: input.decision,
      reviewerId: input.actorUserId,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(volunteerHourEntries.id, input.entryId));

  if (input.decision === "approved") {
    await db.insert(impactEvents).values({
      id: uuidv7(),
      userId: entry.userId,
      kind: "volunteer_hours",
      sourceTable: "volunteer_hour_entries",
      sourceId: entry.id,
      value: entry.hours,
    });
    await refreshImpactScore(entry.userId);
    await evaluateAutoProgression(entry.userId);
    const { evaluateAutomaticBadges } = await import("@/modules/recognition/service");
    await evaluateAutomaticBadges(entry.userId);
  }

  await refreshProfileHourCaches(entry.userId);
  await writeAudit({
    actorUserId: input.actorUserId,
    action:
      input.decision === "approved"
        ? "VOLUNTEER_HOURS_APPROVED"
        : "VOLUNTEER_HOURS_REJECTED",
    resourceType: "volunteer_hour_entry",
    resourceId: input.entryId,
    requestId: input.requestId,
  });

  const { notifyDomainEvent } = await import("@/modules/notifications");
  await notifyDomainEvent({
    eventType:
      input.decision === "approved"
        ? "VOLUNTEER_HOURS_APPROVED"
        : "VOLUNTEER_HOURS_REJECTED",
    recipientUserId: entry.userId,
    variables: { hours: String(entry.hours) },
    linkPath: "/account/volunteer",
    idempotencyKey: `volunteer-hours-${input.decision}:${input.entryId}`,
  });
}

export async function adjustVolunteerHours(input: {
  actorUserId: string;
  entryId: string;
  deltaHours: number;
  reason: string;
  requestId?: string | null;
}) {
  const { entry } = await requireVolunteerHourScope({
    actorUserId: input.actorUserId,
    entryId: input.entryId,
    permission: "volunteer.hours.adjust",
  });
  const db = getDb();
  if (entry.status !== "approved") {
    throw new VolunteerError("adjustment_requires_approved_entry");
  }
  const currentTotal = await recomputeApprovedHours(entry.userId);
  const nextTotal = Number((currentTotal + input.deltaHours).toFixed(2));
  if (nextTotal < 0) {
    throw new VolunteerError("negative_total_blocked");
  }
  const id = uuidv7();
  await db.insert(volunteerHourAdjustments).values({
    id,
    userId: entry.userId,
    hourEntryId: entry.id,
    deltaHours: String(input.deltaHours),
    reason: input.reason,
    actorId: input.actorUserId,
  });
  await refreshProfileHourCaches(entry.userId);
  await refreshImpactScore(entry.userId);
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "VOLUNTEER_HOURS_ADJUSTED",
    resourceType: "volunteer_hour_adjustment",
    resourceId: id,
    reason: input.reason,
    requestId: input.requestId,
  });
  return id;
}

// ─── Impact & Progression ────────────────────────────────────────────────────

export async function refreshImpactScore(userId: string) {
  const db = getDb();
  const events = await db.query.impactEvents.findMany({
    where: eq(impactEvents.userId, userId),
  });
  const rules = await db.query.impactRules.findMany();
  const score = calculateImpactScore(
    events.map((e) => ({
      kind: e.kind,
      value: Number(e.value),
      revokedAt: e.revokedAt,
    })),
    rules.map((r) => ({
      eventKind: r.eventKind,
      weight: Number(r.weight),
      isEnabled: r.isEnabled,
    })),
  );
  await db
    .update(volunteerProfiles)
    .set({ impactScoreCache: score, updatedAt: new Date() })
    .where(eq(volunteerProfiles.userId, userId));
  return score;
}

export async function getApprovedHoursForUser(userId: string): Promise<number> {
  const profile = await getProfileByUserId(userId);
  if (profile) {
    const recomputed = await recomputeApprovedHours(userId);
    if (Number(profile.approvedHoursCache) !== recomputed) {
      await refreshProfileHourCaches(userId);
    }
    return recomputed;
  }
  return recomputeApprovedHours(userId);
}

async function countCompletedOpportunities(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ total: count() })
    .from(volunteerParticipations)
    .where(
      and(
        eq(volunteerParticipations.userId, userId),
        eq(volunteerParticipations.status, "completed"),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function evaluateAutoProgression(userId: string) {
  const profile = await getProfileByUserId(userId);
  if (!profile) return;
  const db = getDb();
  const approvedHours = await recomputeApprovedHours(userId);
  const completed = await countCompletedOpportunities(userId);
  const impactScore = profile.impactScoreCache;
  const rules = await db.query.volunteerProgressionRules.findMany({
    where: eq(volunteerProgressionRules.isEnabled, true),
  });

  let best: ProgressionLevel = profile.progressionLevel as ProgressionLevel;
  for (const rule of rules) {
    const predicate = rule.predicate as {
      minApprovedHours?: number;
      minCompletedOpportunities?: number;
      minImpactScore?: number;
      requiresManualApproval?: boolean;
    };
    if (predicate.requiresManualApproval) continue;
    const slug = rule.slug as ProgressionLevel;
    if (!(PROGRESSION_LEVELS as readonly string[]).includes(slug)) continue;
    const meets =
      (predicate.minApprovedHours ?? 0) <= approvedHours &&
      (predicate.minCompletedOpportunities ?? 0) <= completed &&
      (predicate.minImpactScore ?? 0) <= impactScore;
    if (meets && PROGRESSION_LEVELS.indexOf(slug) > PROGRESSION_LEVELS.indexOf(best)) {
      best = slug;
    }
  }
  if (best !== profile.progressionLevel) {
    await assignProgressionLevel({
      actorUserId: null,
      volunteerProfileId: profile.id,
      level: best,
      reason: "automatic_eligibility",
      automatic: true,
    });
  }
}

export async function assignProgressionLevel(input: {
  actorUserId: string | null;
  volunteerProfileId: string;
  level: ProgressionLevel;
  reason: string;
  automatic?: boolean;
  requestId?: string | null;
}) {
  if (!input.automatic) {
    await requirePermission(input.actorUserId!, "volunteer.progression.manage");
  }
  const db = getDb();
  const profile = await db.query.volunteerProfiles.findFirst({
    where: eq(volunteerProfiles.id, input.volunteerProfileId),
  });
  if (!profile) throw new VolunteerError("volunteer_profile_missing");
  if (profile.progressionLevel === input.level) return;
  await db
    .update(volunteerProfiles)
    .set({ progressionLevel: input.level, updatedAt: new Date() })
    .where(eq(volunteerProfiles.id, profile.id));
  await db.insert(volunteerLevelHistory).values({
    id: uuidv7(),
    volunteerProfileId: profile.id,
    fromLevel: profile.progressionLevel,
    toLevel: input.level,
    actorId: input.actorUserId,
    reason: input.reason,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "VOLUNTEER_LEVEL_CHANGED",
    resourceType: "volunteer_profile",
    resourceId: profile.id,
    before: { level: profile.progressionLevel },
    after: { level: input.level },
    reason: input.reason,
    requestId: input.requestId,
  });
}

// ─── Dashboard & Admin ───────────────────────────────────────────────────────

export async function getVolunteerDashboard(actorUserId: string) {
  await requirePermission(actorUserId, "volunteer.profile.read.own");
  const profile = await getProfileByUserId(actorUserId);
  if (!profile) {
    return { hasProfile: false as const };
  }
  const db = getDb();
  const applications = await db.query.volunteerOpportunityApplications.findMany({
    where: eq(volunteerOpportunityApplications.userId, actorUserId),
    orderBy: (f, { desc: d }) => [d(f.submittedAt)],
    limit: 10,
  });
  const participations = await db.query.volunteerParticipations.findMany({
    where: eq(volunteerParticipations.userId, actorUserId),
    limit: 20,
  });
  const hourEntries = await db.query.volunteerHourEntries.findMany({
    where: eq(volunteerHourEntries.userId, actorUserId),
    orderBy: (f, { desc: d }) => [d(f.createdAt)],
    limit: 20,
  });
  const adjustments = await db.query.volunteerHourAdjustments.findMany({
    where: eq(volunteerHourAdjustments.userId, actorUserId),
    orderBy: (f, { desc: d }) => [d(f.createdAt)],
    limit: 20,
  });
  const approvedHours = await recomputeApprovedHours(actorUserId);
  const pendingHours = await recomputePendingHours(actorUserId);
  const impactEventsList = await db.query.impactEvents.findMany({
    where: eq(impactEvents.userId, actorUserId),
    orderBy: (f, { desc: d }) => [d(f.createdAt)],
    limit: 20,
  });

  return {
    hasProfile: true as const,
    profile: {
      id: profile.id,
      status: profile.status as VolunteerProfileStatus,
      progressionLevel: profile.progressionLevel as ProgressionLevel,
      approvedHours,
      pendingHours,
      impactScore: profile.impactScoreCache,
      joinedAt: profile.joinedAt.toISOString(),
    },
    applications: applications.map((a) => ({
      id: a.id,
      opportunityId: a.opportunityId,
      status: a.status,
      submittedAt: a.submittedAt?.toISOString() ?? null,
    })),
    participations: participations.map((p) => ({
      id: p.id,
      opportunityId: p.opportunityId,
      status: p.status as ParticipationStatus,
      attendanceStatus: p.attendanceStatus,
    })),
    hourEntries: hourEntries.map((e) => ({
      id: e.id,
      hours: Number(e.hours),
      status: e.status,
      activityDate: e.activityDate,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
    adjustments: adjustments.map((a) => ({
      id: a.id,
      hourEntryId: a.hourEntryId,
      deltaHours: Number(a.deltaHours),
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
    })),
    impactEvents: impactEventsList.map((e) => ({
      id: e.id,
      kind: e.kind,
      value: Number(e.value),
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export async function listVolunteersForAdmin(input: {
  actorUserId: string;
  status?: string;
  level?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission(input.actorUserId, "volunteer.profile.read.any");
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const db = getDb();
  const rows = await db.query.volunteerProfiles.findMany({
    where: and(
      input.status ? eq(volunteerProfiles.status, input.status) : undefined,
      input.level ? eq(volunteerProfiles.progressionLevel, input.level) : undefined,
    ),
    orderBy: (f, { desc: d }) => [d(f.joinedAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows, page, pageSize };
}

export async function listApplicationsForAdmin(input: {
  actorUserId: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission(input.actorUserId, "volunteer.application.read.any");
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const scoped = await scopedOpportunityIdsForActor(input.actorUserId);
  if (scoped && scoped.length === 0) {
    return { items: [], page, pageSize };
  }
  const db = getDb();
  const rows = await db.query.volunteerOpportunityApplications.findMany({
    where: and(
      input.status ? eq(volunteerOpportunityApplications.status, input.status) : undefined,
      scoped ? inArray(volunteerOpportunityApplications.opportunityId, scoped) : undefined,
    ),
    orderBy: (f, { desc: d }) => [d(f.submittedAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows, page, pageSize };
}

export async function listHourEntriesForAdmin(input: {
  actorUserId: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission(input.actorUserId, "volunteer.hours.read.any");
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const scoped = await scopedOpportunityIdsForActor(input.actorUserId);
  if (scoped && scoped.length === 0) {
    return { items: [], page, pageSize };
  }
  const db = getDb();
  const rows = await db.query.volunteerHourEntries.findMany({
    where: and(
      input.status ? eq(volunteerHourEntries.status, input.status) : undefined,
      scoped ? inArray(volunteerHourEntries.opportunityId, scoped) : undefined,
    ),
    orderBy: (f, { desc: d }) => [d(f.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows, page, pageSize };
}

export async function getPublicVolunteerImpact(userId: string) {
  const db = getDb();
  const profile = await getProfileByUserId(userId);
  const userProfile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  if (!profile || !userProfile?.hoursPublic) {
    return null;
  }
  const approvedHours = await recomputeApprovedHours(userId);
  const completed = await countCompletedOpportunities(userId);
  return {
    approvedHours,
    completedOpportunities: completed,
    progressionLevel: profile.progressionLevel as ProgressionLevel,
    impactScore: profile.impactScoreCache,
  };
}

export { MANUAL_APPROVAL_LEVELS };
