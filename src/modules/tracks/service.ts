import { and, count, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { notifyDomainEvent } from "@/modules/notifications/notify";
import {
  getPermissionsForUser,
  requirePermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { getDb } from "@/shared/db/client";
import {
  badgeAwards,
  badgeDefinitions,
  contributionTypes,
  contributions,
  impactEvents,
  memberships,
  profiles,
  volunteerHourEntries,
  trackApplications,
  trackContributionReviews,
  trackContributions,
  trackEvents,
  trackInitiatives,
  trackLeadershipAssignments,
  trackMemberships,
  trackTasks,
  tracks,
} from "@/shared/db/schema";
import {
  TRACK_BADGE_SEEDS,
  TRACK_CONTRIBUTION_TYPES,
  TRACK_OPERATING_SEED,
} from "./catalog";
import { TrackError } from "./errors";
import {
  isGlobalTrackAdmin,
  requireActiveTrackMembership,
  requireTrackLeaderScope,
} from "./scope";

async function requireActiveClinicMembership(userId: string) {
  const db = getDb();
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.status, "active")),
  });
  if (!membership) {
    throw new TrackError("membership_required");
  }
  return membership;
}

export async function seedTracksOperatingCatalog(): Promise<void> {
  const db = getDb();
  for (const [index, seed] of TRACK_OPERATING_SEED.entries()) {
    const existing = await db.query.tracks.findFirst({
      where: eq(tracks.slug, seed.slug),
    });
    if (existing) {
      await db
        .update(tracks)
        .set({
          nameAr: seed.nameAr,
          nameEn: seed.nameEn,
          descriptionAr: seed.descriptionAr,
          descriptionEn: seed.descriptionEn,
          purposeAr: seed.purposeAr,
          purposeEn: seed.purposeEn,
          scopeAr: seed.scopeAr,
          scopeEn: seed.scopeEn,
          iconKey: seed.iconKey,
          status: existing.status === "archived" ? "archived" : "active",
          isEnabled: true,
          applicationsOpen: existing.applicationsOpen ?? true,
          allowSecondary: existing.allowSecondary ?? true,
          maxSecondary: existing.maxSecondary ?? 2,
          sortOrder: index + 1,
          updatedAt: new Date(),
        })
        .where(eq(tracks.id, existing.id));
      continue;
    }
    await db.insert(tracks).values({
      id: uuidv7(),
      code: seed.code,
      slug: seed.slug,
      nameAr: seed.nameAr,
      nameEn: seed.nameEn,
      descriptionAr: seed.descriptionAr,
      descriptionEn: seed.descriptionEn,
      purposeAr: seed.purposeAr,
      purposeEn: seed.purposeEn,
      scopeAr: seed.scopeAr,
      scopeEn: seed.scopeEn,
      iconKey: seed.iconKey,
      status: "active",
      isEnabled: true,
      applicationsOpen: true,
      allowSecondary: true,
      maxSecondary: 2,
      sortOrder: index + 1,
    });
  }

  for (const seed of TRACK_BADGE_SEEDS) {
    const existing = await db.query.badgeDefinitions.findFirst({
      where: eq(badgeDefinitions.slug, seed.slug),
    });
    if (!existing) {
      await db.insert(badgeDefinitions).values({
        id: uuidv7(),
        slug: seed.slug,
        nameAr: seed.nameAr,
        nameEn: seed.nameEn,
        criteriaAr: seed.criteriaAr,
        criteriaEn: seed.criteriaEn,
        issuerName: "Strategy & Execution Clinic",
        criteria: seed.criteria,
        issuanceMode: seed.issuanceMode,
        isActive: true,
        isPublic: true,
      });
    }
  }

  for (const [index, type] of TRACK_CONTRIBUTION_TYPES.entries()) {
    const existing = await db.query.contributionTypes.findFirst({
      where: eq(contributionTypes.slug, `track_${type.slug}`),
    });
    if (!existing) {
      await db.insert(contributionTypes).values({
        id: uuidv7(),
        slug: `track_${type.slug}`,
        nameAr: type.nameAr,
        nameEn: type.nameEn,
        impactWeight: "15",
        sortOrder: 100 + index,
        isActive: true,
        requiresReview: true,
      });
    }
  }
}

export async function listPublicOperatingTracks() {
  const db = getDb();
  return db.query.tracks.findMany({
    where: and(eq(tracks.isEnabled, true), eq(tracks.status, "active")),
    orderBy: (fields, { asc }) => [asc(fields.sortOrder)],
  });
}

export async function getTrackBySlug(slug: string) {
  const db = getDb();
  const track = await db.query.tracks.findFirst({ where: eq(tracks.slug, slug) });
  if (!track) throw new TrackError("track_not_found");
  return track;
}

export async function getPublicTrackPage(slug: string) {
  const db = getDb();
  const track = await getTrackBySlug(slug);
  const [leaders, memberships, published, initiatives, events] = await Promise.all([
    db.query.trackLeadershipAssignments.findMany({
      where: and(
        eq(trackLeadershipAssignments.trackId, track.id),
        eq(trackLeadershipAssignments.status, "active"),
      ),
    }),
    db.query.trackMemberships.findMany({
      where: and(eq(trackMemberships.trackId, track.id), eq(trackMemberships.status, "active")),
    }),
    db.query.trackContributions.findMany({
      where: and(
        eq(trackContributions.trackId, track.id),
        inArray(trackContributions.status, ["published", "completed", "approved"]),
      ),
      orderBy: [desc(trackContributions.updatedAt)],
      limit: 20,
    }),
    db.query.trackInitiatives.findMany({
      where: and(eq(trackInitiatives.trackId, track.id), eq(trackInitiatives.status, "active")),
      limit: 20,
    }),
    db.query.trackEvents.findMany({
      where: and(eq(trackEvents.trackId, track.id), eq(trackEvents.status, "scheduled")),
      orderBy: [desc(trackEvents.startsAt)],
      limit: 20,
    }),
  ]);

  const userIds = [
    ...new Set([
      ...leaders.map((row) => row.userId),
      ...memberships.map((row) => row.userId),
    ]),
  ];
  const profileRows =
    userIds.length > 0
      ? await db.query.profiles.findMany({
          where: inArray(profiles.userId, userIds),
        })
      : [];
  const profileMap = new Map(profileRows.map((row) => [row.userId, row]));

  return {
    track,
    leaders: leaders.map((row) => ({
      ...row,
      displayNameAr: profileMap.get(row.userId)?.displayNameAr ?? "عضو",
      displayNameEn: profileMap.get(row.userId)?.displayNameEn ?? "Member",
    })),
    roster: memberships.map((row) => ({
      ...row,
      displayNameAr: profileMap.get(row.userId)?.displayNameAr ?? "عضو",
      displayNameEn: profileMap.get(row.userId)?.displayNameEn ?? "Member",
    })),
    contributions: published,
    initiatives,
    events,
    impact: {
      members: memberships.length,
      publishedContributions: published.length,
      activeInitiatives: initiatives.length,
      upcomingEvents: events.length,
    },
  };
}

export async function applyToTrack(input: {
  actorUserId: string;
  trackId: string;
  requestedRole?: string;
  wantPrimary?: boolean;
  motivation?: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "track.application.create");
  const clinicMembership = await requireActiveClinicMembership(input.actorUserId);
  const db = getDb();
  const track = await db.query.tracks.findFirst({ where: eq(tracks.id, input.trackId) });
  if (!track || track.status !== "active" || !track.applicationsOpen) {
    throw new TrackError("track_closed");
  }
  const existingMembership = await db.query.trackMemberships.findFirst({
    where: and(
      eq(trackMemberships.trackId, input.trackId),
      eq(trackMemberships.userId, input.actorUserId),
      eq(trackMemberships.status, "active"),
    ),
  });
  if (existingMembership) throw new TrackError("already_member");

  const pending = await db.query.trackApplications.findFirst({
    where: and(
      eq(trackApplications.trackId, input.trackId),
      eq(trackApplications.userId, input.actorUserId),
      inArray(trackApplications.status, ["submitted", "under_review"]),
    ),
  });
  if (pending) throw new TrackError("application_pending");

  const id = uuidv7();
  await db.insert(trackApplications).values({
    id,
    trackId: input.trackId,
    userId: input.actorUserId,
    requestedRole: input.requestedRole ?? "member",
    wantPrimary: Boolean(input.wantPrimary),
    motivation: input.motivation ?? null,
    status: "submitted",
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "TRACK_APPLICATION_SUBMITTED",
    resourceType: "track_application",
    resourceId: id,
    requestId: input.requestId,
    after: { trackId: input.trackId, membershipId: clinicMembership.id },
  });
  await notifyDomainEvent({
    eventType: "TRACK_APPLICATION_RECEIVED",
    recipientUserId: input.actorUserId,
    linkPath: "/account/tracks",
    idempotencyKey: `track-application-received:${id}`,
  });
  return { id };
}

async function activateTrackMembership(input: {
  trackId: string;
  userId: string;
  role: string;
  isPrimary: boolean;
  source: string;
  assignedBy?: string | null;
  membershipId?: string | null;
}) {
  const db = getDb();
  if (input.isPrimary) {
    await db
      .update(trackMemberships)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(and(eq(trackMemberships.userId, input.userId), eq(trackMemberships.status, "active")));
  }
  const existing = await db.query.trackMemberships.findFirst({
    where: and(
      eq(trackMemberships.trackId, input.trackId),
      eq(trackMemberships.userId, input.userId),
    ),
  });
  if (existing) {
    await db
      .update(trackMemberships)
      .set({
        role: input.role,
        isPrimary: input.isPrimary,
        status: "active",
        leftAt: null,
        source: input.source,
        assignedBy: input.assignedBy ?? null,
        membershipId: input.membershipId ?? existing.membershipId,
        updatedAt: new Date(),
      })
      .where(eq(trackMemberships.id, existing.id));
    await syncTrackBadges(input.userId);
    return existing.id;
  }
  const id = uuidv7();
  await db.insert(trackMemberships).values({
    id,
    trackId: input.trackId,
    userId: input.userId,
    membershipId: input.membershipId ?? null,
    role: input.role,
    isPrimary: input.isPrimary,
    status: "active",
    source: input.source,
    assignedBy: input.assignedBy ?? null,
  });
  await syncTrackBadges(input.userId);
  return id;
}

export async function reviewTrackApplication(input: {
  actorUserId: string;
  applicationId: string;
  decision: "approved" | "rejected";
  reason?: string;
  requestId?: string | null;
}) {
  const db = getDb();
  const application = await db.query.trackApplications.findFirst({
    where: eq(trackApplications.id, input.applicationId),
  });
  if (!application) throw new TrackError("application_not_found");
  if (application.userId === input.actorUserId) {
    throw new AuthorizationError("cannot_review_own_track_application");
  }
  await requireTrackLeaderScope({
    actorUserId: input.actorUserId,
    trackId: application.trackId,
    permission:
      input.decision === "approved"
        ? "track.application.approve"
        : "track.application.reject",
  });
  if (!["submitted", "under_review"].includes(application.status)) {
    throw new TrackError("invalid_application_state");
  }

  const now = new Date();
  await db
    .update(trackApplications)
    .set({
      status: input.decision,
      reviewerId: input.actorUserId,
      decisionReason: input.reason ?? null,
      decidedAt: now,
      updatedAt: now,
    })
    .where(eq(trackApplications.id, application.id));

  if (input.decision === "approved") {
    const clinicMembership = await requireActiveClinicMembership(application.userId);
    await activateTrackMembership({
      trackId: application.trackId,
      userId: application.userId,
      role: application.requestedRole,
      isPrimary: application.wantPrimary,
      source: "application",
      assignedBy: input.actorUserId,
      membershipId: clinicMembership.id,
    });
  }

  await writeAudit({
    actorUserId: input.actorUserId,
    action:
      input.decision === "approved"
        ? "TRACK_APPLICATION_APPROVED"
        : "TRACK_APPLICATION_REJECTED",
    resourceType: "track_application",
    resourceId: application.id,
    requestId: input.requestId,
    reason: input.reason,
  });
  await notifyDomainEvent({
    eventType:
      input.decision === "approved"
        ? "TRACK_APPLICATION_APPROVED"
        : "TRACK_APPLICATION_REJECTED",
    recipientUserId: application.userId,
    linkPath: "/account/tracks",
    idempotencyKey: `track-application-${input.decision}:${application.id}`,
  });
}

export async function assignTrackMember(input: {
  actorUserId: string;
  trackId: string;
  userId: string;
  role?: string;
  isPrimary?: boolean;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "track.membership.assign");
  if (!(await isGlobalTrackAdmin(input.actorUserId))) {
    throw new AuthorizationError("forbidden");
  }
  const clinicMembership = await requireActiveClinicMembership(input.userId);
  const id = await activateTrackMembership({
    trackId: input.trackId,
    userId: input.userId,
    role: input.role ?? "member",
    isPrimary: Boolean(input.isPrimary),
    source: "admin_assign",
    assignedBy: input.actorUserId,
    membershipId: clinicMembership.id,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "TRACK_MEMBERSHIP_ASSIGNED",
    resourceType: "track_membership",
    resourceId: id,
    requestId: input.requestId,
    after: { trackId: input.trackId, userId: input.userId },
  });
  return { id };
}

export async function appointTrackLeader(input: {
  actorUserId: string;
  trackId: string;
  userId: string;
  leadershipRole: "primary" | "deputy";
  endsAt?: Date | null;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "track.leadership.manage");
  if (!(await isGlobalTrackAdmin(input.actorUserId))) {
    throw new AuthorizationError("forbidden");
  }
  const db = getDb();
  const now = new Date();
  if (input.leadershipRole === "primary") {
    await db
      .update(trackLeadershipAssignments)
      .set({
        status: "revoked",
        revokedAt: now,
        revokeReason: "replaced_by_new_primary",
        endsAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(trackLeadershipAssignments.trackId, input.trackId),
          eq(trackLeadershipAssignments.leadershipRole, "primary"),
          eq(trackLeadershipAssignments.status, "active"),
        ),
      );
  }
  const id = uuidv7();
  await db.insert(trackLeadershipAssignments).values({
    id,
    trackId: input.trackId,
    userId: input.userId,
    leadershipRole: input.leadershipRole,
    status: "active",
    startsAt: now,
    endsAt: input.endsAt ?? null,
    appointedBy: input.actorUserId,
  });
  const existingMembership = await db.query.trackMemberships.findFirst({
    where: and(
      eq(trackMemberships.trackId, input.trackId),
      eq(trackMemberships.userId, input.userId),
      eq(trackMemberships.status, "active"),
    ),
  });
  await activateTrackMembership({
    trackId: input.trackId,
    userId: input.userId,
    role: existingMembership?.role ?? "member",
    isPrimary: existingMembership?.isPrimary ?? false,
    source: "leadership",
    assignedBy: input.actorUserId,
  });
  await syncTrackBadges(input.userId);
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "TRACK_LEADER_APPOINTED",
    resourceType: "track_leadership",
    resourceId: id,
    requestId: input.requestId,
    after: {
      trackId: input.trackId,
      userId: input.userId,
      leadershipRole: input.leadershipRole,
    },
  });
  await notifyDomainEvent({
    eventType: "TRACK_LEADER_APPOINTED",
    recipientUserId: input.userId,
    linkPath: `/account/tracks`,
    idempotencyKey: `track-leader-appointed:${id}`,
  });
  return { id };
}

export async function revokeTrackLeader(input: {
  actorUserId: string;
  assignmentId: string;
  reason?: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "track.leadership.manage");
  if (!(await isGlobalTrackAdmin(input.actorUserId))) {
    throw new AuthorizationError("forbidden");
  }
  const db = getDb();
  const row = await db.query.trackLeadershipAssignments.findFirst({
    where: eq(trackLeadershipAssignments.id, input.assignmentId),
  });
  if (!row) throw new TrackError("leadership_not_found");
  const now = new Date();
  await db
    .update(trackLeadershipAssignments)
    .set({
      status: "revoked",
      revokedAt: now,
      endsAt: now,
      revokeReason: input.reason ?? "revoked",
      updatedAt: now,
    })
    .where(eq(trackLeadershipAssignments.id, row.id));
  await syncTrackBadges(row.userId);
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "TRACK_LEADER_REVOKED",
    resourceType: "track_leadership",
    resourceId: row.id,
    requestId: input.requestId,
    reason: input.reason,
  });
}

export async function suspendTrackPrivilegesForUser(input: {
  userId: string;
  reason: string;
  requestId?: string | null;
}) {
  const db = getDb();
  const now = new Date();
  await db
    .update(trackMemberships)
    .set({ status: "suspended", leftAt: now, updatedAt: now })
    .where(and(eq(trackMemberships.userId, input.userId), eq(trackMemberships.status, "active")));
  await db
    .update(trackLeadershipAssignments)
    .set({
      status: "suspended",
      revokedAt: now,
      endsAt: now,
      revokeReason: input.reason,
      updatedAt: now,
    })
    .where(
      and(
        eq(trackLeadershipAssignments.userId, input.userId),
        eq(trackLeadershipAssignments.status, "active"),
      ),
    );
  await syncTrackBadges(input.userId);
  await writeAudit({
    actorUserId: null,
    action: "TRACK_PRIVILEGES_SUSPENDED",
    resourceType: "user",
    resourceId: input.userId,
    requestId: input.requestId,
    reason: input.reason,
  });
}

export async function createTrackContribution(input: {
  actorUserId: string;
  trackId: string;
  contributionType: string;
  titleAr: string;
  titleEn: string;
  summaryAr?: string;
  summaryEn?: string;
  hoursClaimed?: number | null;
  submit?: boolean;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "track.contribution.create.own");
  await requireActiveClinicMembership(input.actorUserId);
  await requireActiveTrackMembership({
    userId: input.actorUserId,
    trackId: input.trackId,
  });
  if (!TRACK_CONTRIBUTION_TYPES.some((type) => type.slug === input.contributionType)) {
    throw new TrackError("invalid_contribution_type");
  }
  const db = getDb();
  const id = uuidv7();
  const status = input.submit ? "submitted" : "draft";
  await db.insert(trackContributions).values({
    id,
    trackId: input.trackId,
    userId: input.actorUserId,
    contributionType: input.contributionType,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    summaryAr: input.summaryAr ?? null,
    summaryEn: input.summaryEn ?? null,
    status,
    hoursClaimed: input.hoursClaimed != null ? String(input.hoursClaimed) : null,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: input.submit ? "TRACK_CONTRIBUTION_SUBMITTED" : "TRACK_CONTRIBUTION_DRAFTED",
    resourceType: "track_contribution",
    resourceId: id,
    requestId: input.requestId,
  });
  return { id };
}

export async function reviewTrackContribution(input: {
  actorUserId: string;
  contributionId: string;
  decision:
    | "under_review"
    | "changes_requested"
    | "approved"
    | "published"
    | "completed"
    | "rejected"
    | "archived"
    | "cancelled";
  reason?: string;
  hoursAwarded?: number | null;
  requestId?: string | null;
}) {
  const db = getDb();
  const row = await db.query.trackContributions.findFirst({
    where: eq(trackContributions.id, input.contributionId),
  });
  if (!row) throw new TrackError("contribution_not_found");
  // Authors never review their own submissions — route to another leader or admin.
  if (row.userId === input.actorUserId) {
    throw new AuthorizationError("cannot_approve_own_track_contribution");
  }
  await requireTrackLeaderScope({
    actorUserId: input.actorUserId,
    trackId: row.trackId,
    permission: "track.contribution.review",
    allowDeputy: true,
  });

  const fromStatus = row.status;
  if (!planContributionTransition(fromStatus, input.decision)) {
    throw new TrackError("invalid_contribution_transition");
  }
  const now = new Date();
  const patch: Partial<typeof trackContributions.$inferInsert> = {
    status: input.decision,
    updatedAt: now,
  };
  if (input.decision === "published") patch.publishedAt = now;
  if (input.decision === "completed") patch.completedAt = now;
  if (input.hoursAwarded != null) patch.hoursAwarded = String(input.hoursAwarded);

  await db.update(trackContributions).set(patch).where(eq(trackContributions.id, row.id));
  await db.insert(trackContributionReviews).values({
    id: uuidv7(),
    contributionId: row.id,
    actorUserId: input.actorUserId,
    action: input.decision,
    fromStatus,
    toStatus: input.decision,
    reason: input.reason ?? null,
  });

  if (["approved", "published", "completed"].includes(input.decision)) {
    await awardTrackContributionRewards({
      contributionId: row.id,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      hoursAwarded:
        input.hoursAwarded ??
        (row.hoursAwarded != null ? Number(row.hoursAwarded) : null) ??
        (row.hoursClaimed != null ? Number(row.hoursClaimed) : null),
    });
  }

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "TRACK_CONTRIBUTION_REVIEWED",
    resourceType: "track_contribution",
    resourceId: row.id,
    requestId: input.requestId,
    reason: input.reason,
    after: { fromStatus, toStatus: input.decision },
  });
  await notifyDomainEvent({
    eventType: "TRACK_CONTRIBUTION_STATUS_CHANGED",
    recipientUserId: row.userId,
    linkPath: `/account/tracks`,
    idempotencyKey: `track-contribution-${input.decision}:${row.id}:${fromStatus}`,
    variables: { status: input.decision },
  });
}

async function awardTrackContributionRewards(input: {
  contributionId: string;
  actorUserId: string;
  requestId?: string | null;
  hoursAwarded?: number | null;
}) {
  const db = getDb();
  const row = await db.query.trackContributions.findFirst({
    where: eq(trackContributions.id, input.contributionId),
  });
  if (!row) return;

  if (!row.impactAwarded) {
    const existingImpact = await db.query.impactEvents.findFirst({
      where: and(
        eq(impactEvents.sourceTable, "track_contributions"),
        eq(impactEvents.sourceId, row.id),
        isNull(impactEvents.revokedAt),
      ),
    });
    if (!existingImpact) {
      await db.insert(impactEvents).values({
        id: uuidv7(),
        userId: row.userId,
        kind: "approved_contribution",
        sourceTable: "track_contributions",
        sourceId: row.id,
        value: "15",
      });
    }
    await db
      .update(trackContributions)
      .set({ impactAwarded: true, updatedAt: new Date() })
      .where(eq(trackContributions.id, row.id));
  }

  const hoursToAward =
    input.hoursAwarded != null && Number.isFinite(input.hoursAwarded) && input.hoursAwarded > 0
      ? input.hoursAwarded
      : null;
  if (hoursToAward != null) {
    const hourSource = `track_contribution:${row.id}`;
    const existingHours = await db.query.volunteerHourEntries.findFirst({
      where: and(
        eq(volunteerHourEntries.userId, row.userId),
        eq(volunteerHourEntries.source, hourSource),
      ),
    });
    if (!existingHours) {
      await db.insert(volunteerHourEntries).values({
        id: uuidv7(),
        userId: row.userId,
        hours: String(hoursToAward),
        activityDate: new Date().toISOString().slice(0, 10),
        description: `Track contribution: ${row.titleEn}`,
        status: "approved",
        source: hourSource,
        submittedBy: input.actorUserId,
        reviewerId: input.actorUserId,
        reviewedAt: new Date(),
        reviewNotes: "Awarded from approved track contribution",
      });
    }
    if (row.hoursAwarded == null) {
      await db
        .update(trackContributions)
        .set({ hoursAwarded: String(hoursToAward), updatedAt: new Date() })
        .where(eq(trackContributions.id, row.id));
    }
  }

  if (!row.recognitionContributionId) {
    const type = await db.query.contributionTypes.findFirst({
      where: eq(contributionTypes.slug, `track_${row.contributionType}`),
    });
    const recognitionId = uuidv7();
    await db.insert(contributions).values({
      id: recognitionId,
      userId: row.userId,
      contributionTypeId: type?.id ?? null,
      kind: row.contributionType,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      descriptionAr: row.summaryAr,
      descriptionEn: row.summaryEn,
      status: "approved",
      source: "track_contribution",
      submittedBy: row.userId,
      reviewerId: input.actorUserId,
      reviewedAt: new Date(),
    });
    await db
      .update(trackContributions)
      .set({ recognitionContributionId: recognitionId, updatedAt: new Date() })
      .where(eq(trackContributions.id, row.id));
  }

  if (!row.badgeAwarded) {
    const definition = await db.query.badgeDefinitions.findFirst({
      where: eq(badgeDefinitions.slug, "contributor"),
    });
    if (definition) {
      const existingBadge = await db.query.badgeAwards.findFirst({
        where: and(
          eq(badgeAwards.userId, row.userId),
          eq(badgeAwards.badgeDefinitionId, definition.id),
          eq(badgeAwards.status, "active"),
        ),
      });
      if (!existingBadge) {
        await db.insert(badgeAwards).values({
          id: uuidv7(),
          badgeDefinitionId: definition.id,
          userId: row.userId,
          status: "active",
          issuedAt: new Date(),
          issuerUserId: input.actorUserId,
          sourceType: "track_contribution",
          sourceId: row.id,
          reason: "Approved track contribution",
        });
      }
      await db
        .update(trackContributions)
        .set({ badgeAwarded: true, updatedAt: new Date() })
        .where(eq(trackContributions.id, row.id));
    }
  }
}

export async function syncTrackBadges(userId: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  const [primaryDef, leaderDef] = await Promise.all([
    db.query.badgeDefinitions.findFirst({
      where: eq(badgeDefinitions.slug, "track_primary_member"),
    }),
    db.query.badgeDefinitions.findFirst({
      where: eq(badgeDefinitions.slug, "track_group_leader"),
    }),
  ]);

  const primary = await db.query.trackMemberships.findFirst({
    where: and(
      eq(trackMemberships.userId, userId),
      eq(trackMemberships.status, "active"),
      eq(trackMemberships.isPrimary, true),
    ),
  });
  if (primaryDef) {
    const existing = await db.query.badgeAwards.findFirst({
      where: and(
        eq(badgeAwards.userId, userId),
        eq(badgeAwards.badgeDefinitionId, primaryDef.id),
        eq(badgeAwards.status, "active"),
      ),
    });
    if (primary && !existing) {
      await db.insert(badgeAwards).values({
        id: uuidv7(),
        badgeDefinitionId: primaryDef.id,
        userId,
        status: "active",
        issuedAt: now,
        sourceType: "track_membership",
        sourceId: primary.id,
        evidence: { trackId: primary.trackId },
      });
    } else if (!primary && existing) {
      await db
        .update(badgeAwards)
        .set({ status: "revoked", revokedAt: now })
        .where(eq(badgeAwards.id, existing.id));
    } else if (primary && existing && existing.sourceId !== primary.id) {
      await db
        .update(badgeAwards)
        .set({
          sourceId: primary.id,
          evidence: { trackId: primary.trackId },
        })
        .where(eq(badgeAwards.id, existing.id));
    }
  }

  const leadership = await db.query.trackLeadershipAssignments.findFirst({
    where: and(
      eq(trackLeadershipAssignments.userId, userId),
      eq(trackLeadershipAssignments.status, "active"),
      eq(trackLeadershipAssignments.leadershipRole, "primary"),
    ),
  });
  if (leaderDef) {
    const existing = await db.query.badgeAwards.findFirst({
      where: and(
        eq(badgeAwards.userId, userId),
        eq(badgeAwards.badgeDefinitionId, leaderDef.id),
        eq(badgeAwards.status, "active"),
      ),
    });
    if (leadership && !existing) {
      await db.insert(badgeAwards).values({
        id: uuidv7(),
        badgeDefinitionId: leaderDef.id,
        userId,
        status: "active",
        issuedAt: now,
        sourceType: "track_leadership",
        sourceId: leadership.id,
        evidence: { trackId: leadership.trackId, role: "primary" },
      });
    } else if (!leadership && existing) {
      await db
        .update(badgeAwards)
        .set({ status: "revoked", revokedAt: now })
        .where(eq(badgeAwards.id, existing.id));
    }
  }
}

export async function getMemberTrackDashboard(userId: string) {
  const db = getDb();
  const membershipRows = await db.query.trackMemberships.findMany({
    where: and(eq(trackMemberships.userId, userId), eq(trackMemberships.status, "active")),
  });
  const trackIds = membershipRows.map((row) => row.trackId);
  const trackRows =
    trackIds.length > 0
      ? await db.query.tracks.findMany({ where: inArray(tracks.id, trackIds) })
      : [];
  const contributions = await db.query.trackContributions.findMany({
    where: eq(trackContributions.userId, userId),
    orderBy: [desc(trackContributions.updatedAt)],
  });
  const tasks = await db.query.trackTasks.findMany({
    where: and(eq(trackTasks.assigneeUserId, userId), inArray(trackTasks.status, ["open", "in_progress"])),
  });
  const leadership = await db.query.trackLeadershipAssignments.findMany({
    where: and(eq(trackLeadershipAssignments.userId, userId), eq(trackLeadershipAssignments.status, "active")),
  });
  return { memberships: membershipRows, tracks: trackRows, contributions, tasks, leadership };
}

export async function getLeaderWorkspace(input: {
  actorUserId: string;
  slug: string;
}) {
  const track = await getTrackBySlug(input.slug);
  await requireTrackLeaderScope({
    actorUserId: input.actorUserId,
    trackId: track.id,
    permission: "track.contribution.read.scoped",
  });
  const db = getDb();
  const [applications, roster, queue, initiatives, tasks, events] = await Promise.all([
    db.query.trackApplications.findMany({
      where: and(
        eq(trackApplications.trackId, track.id),
        inArray(trackApplications.status, ["submitted", "under_review"]),
      ),
      orderBy: [desc(trackApplications.submittedAt)],
    }),
    db.query.trackMemberships.findMany({
      where: and(eq(trackMemberships.trackId, track.id), eq(trackMemberships.status, "active")),
    }),
    db.query.trackContributions.findMany({
      where: and(
        eq(trackContributions.trackId, track.id),
        inArray(trackContributions.status, ["submitted", "under_review", "changes_requested"]),
      ),
      orderBy: [desc(trackContributions.updatedAt)],
    }),
    db.query.trackInitiatives.findMany({
      where: eq(trackInitiatives.trackId, track.id),
    }),
    db.query.trackTasks.findMany({
      where: eq(trackTasks.trackId, track.id),
    }),
    db.query.trackEvents.findMany({
      where: eq(trackEvents.trackId, track.id),
      orderBy: [desc(trackEvents.startsAt)],
    }),
  ]);
  const analytics = {
    members: roster.length,
    pendingApplications: applications.length,
    pendingReviews: queue.length,
    initiatives: initiatives.filter((row) => row.status === "active").length,
    openTasks: tasks.filter((row) => row.status === "open").length,
    upcomingEvents: events.filter((row) => row.status === "scheduled").length,
  };
  return { track, applications, roster, queue, initiatives, tasks, events, analytics };
}

export async function listTrackApplicationsForAdmin(actorUserId: string) {
  await requirePermission(actorUserId, "track.application.read.any");
  const db = getDb();
  return db.query.trackApplications.findMany({
    orderBy: [desc(trackApplications.submittedAt)],
    limit: 100,
  });
}

export async function configureTrack(input: {
  actorUserId: string;
  trackId: string;
  patch: Partial<{
    applicationsOpen: boolean;
    allowSecondary: boolean;
    maxSecondary: number;
    status: "active" | "suspended" | "archived";
    isEnabled: boolean;
  }>;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "track.manage");
  const db = getDb();
  const before = await db.query.tracks.findFirst({ where: eq(tracks.id, input.trackId) });
  if (!before) throw new TrackError("track_not_found");
  const now = new Date();
  await db
    .update(tracks)
    .set({
      ...input.patch,
      suspendedAt: input.patch.status === "suspended" ? now : before.suspendedAt,
      archivedAt: input.patch.status === "archived" ? now : before.archivedAt,
      updatedAt: now,
    })
    .where(eq(tracks.id, input.trackId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "TRACK_UPDATED",
    resourceType: "track",
    resourceId: input.trackId,
    requestId: input.requestId,
    before,
    after: input.patch,
  });
}

export async function getVerifiedTrackIdentity(userId: string) {
  const db = getDb();
  const now = new Date();
  const memberships = await db.query.trackMemberships.findMany({
    where: and(eq(trackMemberships.userId, userId), eq(trackMemberships.status, "active")),
  });
  const leadership = await db.query.trackLeadershipAssignments.findMany({
    where: and(
      eq(trackLeadershipAssignments.userId, userId),
      eq(trackLeadershipAssignments.status, "active"),
      eq(trackLeadershipAssignments.leadershipRole, "primary"),
      lte(trackLeadershipAssignments.startsAt, now),
      or(
        isNull(trackLeadershipAssignments.endsAt),
        gt(trackLeadershipAssignments.endsAt, now),
      ),
    ),
  });
  const trackIds = [...new Set([...memberships.map((m) => m.trackId), ...leadership.map((l) => l.trackId)])];
  const trackRows =
    trackIds.length > 0
      ? await db.query.tracks.findMany({ where: inArray(tracks.id, trackIds) })
      : [];
  const byId = new Map(trackRows.map((row) => [row.id, row]));
  const primary = memberships.find((row) => row.isPrimary);
  return {
    primaryTrack: primary ? byId.get(primary.trackId) ?? null : null,
    secondaryTracks: memberships
      .filter((row) => !row.isPrimary)
      .map((row) => byId.get(row.trackId))
      .filter(Boolean),
    isGroupLeader: leadership.length > 0,
    leadershipTracks: leadership
      .map((row) => byId.get(row.trackId))
      .filter(Boolean),
  };
}

export function planContributionTransition(from: string, to: string): boolean {
  const allowed: Record<string, string[]> = {
    draft: ["submitted", "cancelled"],
    submitted: ["under_review", "cancelled"],
    under_review: ["changes_requested", "approved", "rejected", "cancelled"],
    changes_requested: ["submitted", "cancelled"],
    approved: ["published", "completed", "archived"],
    published: ["completed", "archived"],
    completed: ["archived"],
    rejected: ["archived"],
    archived: [],
    cancelled: [],
  };
  return (allowed[from] ?? []).includes(to);
}

export async function actorCanAccessTrackManage(
  actorUserId: string,
  trackId: string,
): Promise<boolean> {
  try {
    await requireTrackLeaderScope({
      actorUserId,
      trackId,
      permission: "track.contribution.read.scoped",
    });
    return true;
  } catch {
    return false;
  }
}

export async function countPendingTrackReviews(trackId: string) {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(trackContributions)
    .where(
      and(
        eq(trackContributions.trackId, trackId),
        inArray(trackContributions.status, ["submitted", "under_review", "changes_requested"]),
      ),
    );
  return Number(row?.value ?? 0);
}

export async function listPermissionsForTrackActor(userId: string) {
  return getPermissionsForUser(userId);
}
