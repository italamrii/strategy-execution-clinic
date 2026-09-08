import { and, count, eq, ilike, inArray, or } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { calculateImpactScore } from "@/modules/community/impact-score";
import { consumeRateLimit, getPermissionsForUser, requirePermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { getDb } from "@/shared/db/client";
import {
  badgeAwards,
  badgeDefinitions,
  certificateDefinitions,
  certificates,
  contributionTypes,
  contributions,
  credentials,
  impactEvents,
  impactRules,
  memberMilestones,
  milestoneDefinitions,
  memberTracks,
  membershipTypes,
  memberships,
  profiles,
  publicProfileSettings,
  tracks,
  volunteerParticipations,
  volunteerProfiles,
} from "@/shared/db/schema";
import { getApprovedHoursForUser } from "@/modules/volunteering/service";
import {
  BADGE_DEFINITION_SEEDS,
  CERTIFICATE_DEFINITION_SEEDS,
  CONTRIBUTION_TYPE_SEEDS,
  RESERVED_HANDLES,
  VOLUNTEER_HOUR_MILESTONES,
  type ContributionStatus,
} from "./catalog";
import { RecognitionError } from "./errors";
import { generateRecognitionPublicCode } from "./public-code";

export async function seedRecognitionCatalog() {
  const db = getDb();
  for (const seed of CONTRIBUTION_TYPE_SEEDS) {
    const existing = await db.query.contributionTypes.findFirst({
      where: eq(contributionTypes.slug, seed.slug),
    });
    if (!existing) {
      await db.insert(contributionTypes).values({
        id: uuidv7(),
        slug: seed.slug,
        nameAr: seed.nameAr,
        nameEn: seed.nameEn,
        impactWeight: String(seed.impactWeight),
        sortOrder: seed.sortOrder,
      });
    }
  }
  for (const seed of BADGE_DEFINITION_SEEDS) {
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
  for (const seed of CERTIFICATE_DEFINITION_SEEDS) {
    const existing = await db.query.certificateDefinitions.findFirst({
      where: eq(certificateDefinitions.slug, seed.slug),
    });
    if (!existing) {
      await db.insert(certificateDefinitions).values({
        id: uuidv7(),
        slug: seed.slug,
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        sourceRequirement: seed.sourceRequirement,
      });
    }
  }
  let sortOrder = 10;
  for (const threshold of VOLUNTEER_HOUR_MILESTONES) {
    const existing = await db.query.milestoneDefinitions.findFirst({
      where: and(
        eq(milestoneDefinitions.kind, "volunteer_hours"),
        eq(milestoneDefinitions.threshold, threshold),
      ),
    });
    if (!existing) {
      await db.insert(milestoneDefinitions).values({
        id: uuidv7(),
        kind: "volunteer_hours",
        threshold,
        nameAr: `${threshold} ساعة تطوع معتمدة`,
        nameEn: `${threshold} approved volunteer hours`,
        isEnabled: true,
        sortOrder,
      });
    }
    sortOrder += 10;
  }
}

// ─── Contributions ───────────────────────────────────────────────────────────

export async function submitContribution(input: {
  actorUserId: string;
  contributionTypeId: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  occurredAt?: string;
  visibility?: "private" | "public";
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "contribution.create.own");
  const db = getDb();
  const type = await db.query.contributionTypes.findFirst({
    where: eq(contributionTypes.id, input.contributionTypeId),
  });
  if (!type || !type.isActive) throw new RecognitionError("contribution_type_inactive");
  const id = uuidv7();
  await db.insert(contributions).values({
    id,
    userId: input.actorUserId,
    contributionTypeId: type.id,
    kind: type.slug,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    descriptionAr: input.descriptionAr ?? null,
    descriptionEn: input.descriptionEn ?? null,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    source: "member_submission",
    visibility: input.visibility ?? "private",
    status: "submitted",
    submittedBy: input.actorUserId,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "CONTRIBUTION_SUBMITTED",
    resourceType: "contribution",
    resourceId: id,
    requestId: input.requestId,
  });
  return id;
}

export async function reviewContribution(input: {
  actorUserId: string;
  contributionId: string;
  decision: "approved" | "rejected";
  reviewNotes?: string;
  requestId?: string | null;
}) {
  await requirePermission(
    input.actorUserId,
    input.decision === "approved" ? "contribution.approve" : "contribution.reject",
  );
  const db = getDb();
  const row = await db.query.contributions.findFirst({
    where: eq(contributions.id, input.contributionId),
  });
  if (!row) throw new RecognitionError("contribution_not_found");
  if (row.userId === input.actorUserId) {
    throw new AuthorizationError("cannot approve own contribution");
  }
  if (!["submitted", "under_review"].includes(row.status)) {
    throw new RecognitionError("invalid_contribution_state");
  }
  const now = new Date();
  await db
    .update(contributions)
    .set({
      status: input.decision === "approved" ? "approved" : "rejected",
      reviewerId: input.actorUserId,
      reviewedAt: now,
      reviewNotes: input.reviewNotes ?? null,
      updatedAt: now,
    })
    .where(eq(contributions.id, input.contributionId));

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "CONTRIBUTION_REVIEW_STARTED",
    resourceType: "contribution",
    resourceId: input.contributionId,
    requestId: input.requestId,
  });

  if (input.decision === "approved") {
    const type = row.contributionTypeId
      ? await db.query.contributionTypes.findFirst({
          where: eq(contributionTypes.id, row.contributionTypeId),
        })
      : null;
    await db.insert(impactEvents).values({
      id: uuidv7(),
      userId: row.userId,
      kind: "approved_contribution",
      sourceTable: "contributions",
      sourceId: row.id,
      value: type?.impactWeight ?? "10",
    });
    await refreshMemberImpact(row.userId);
    await evaluateAutomaticBadges(row.userId);
    const perms = await getPermissionsForUser(input.actorUserId);
    if (perms.includes("certificate.issue")) {
      await issueCertificate({
        actorUserId: input.actorUserId,
        definitionSlug: "approved_contribution",
        userId: row.userId,
        sourceType: "contribution",
        sourceId: row.id,
        requestId: input.requestId,
      });
    }
  }
  await writeAudit({
    actorUserId: input.actorUserId,
    action: input.decision === "approved" ? "CONTRIBUTION_APPROVED" : "CONTRIBUTION_REJECTED",
    resourceType: "contribution",
    resourceId: input.contributionId,
    requestId: input.requestId,
  });
  const { notifyDomainEvent } = await import("@/modules/notifications");
  await notifyDomainEvent({
    eventType: input.decision === "approved" ? "CONTRIBUTION_APPROVED" : "CONTRIBUTION_REJECTED",
    recipientUserId: row.userId,
    linkPath: "/account/contributions",
    idempotencyKey: `contribution-${input.decision}:${input.contributionId}`,
  });
}

export async function revokeContribution(input: {
  actorUserId: string;
  contributionId: string;
  reason: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "contribution.revoke");
  const db = getDb();
  const row = await db.query.contributions.findFirst({
    where: eq(contributions.id, input.contributionId),
  });
  if (!row || row.status !== "approved") {
    throw new RecognitionError("contribution_not_approved");
  }
  await db
    .update(contributions)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(contributions.id, input.contributionId));
  await db
    .update(impactEvents)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(impactEvents.sourceTable, "contributions"),
        eq(impactEvents.sourceId, input.contributionId),
      ),
    );
  await refreshMemberImpact(row.userId);
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "CONTRIBUTION_REVOKED",
    resourceType: "contribution",
    resourceId: input.contributionId,
    reason: input.reason,
    requestId: input.requestId,
  });
}

export async function listOwnContributions(actorUserId: string) {
  await requirePermission(actorUserId, "contribution.read.own");
  const db = getDb();
  return db.query.contributions.findMany({
    where: eq(contributions.userId, actorUserId),
    orderBy: (f, { desc: d }) => [d(f.createdAt)],
    limit: 50,
  });
}

export async function listContributionsForAdmin(input: {
  actorUserId: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission(input.actorUserId, "contribution.read.any");
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const db = getDb();
  const items = await db.query.contributions.findMany({
    where: input.status ? eq(contributions.status, input.status) : undefined,
    orderBy: (f, { desc: d }) => [d(f.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items, page, pageSize };
}

// ─── Impact ──────────────────────────────────────────────────────────────────

export async function refreshMemberImpact(userId: string) {
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

export async function getImpactBreakdown(userId: string) {
  const db = getDb();
  const events = await db.query.impactEvents.findMany({
    where: and(eq(impactEvents.userId, userId)),
  });
  const rules = await db.query.impactRules.findMany();
  const weights = new Map(
    rules.filter((r) => r.isEnabled).map((r) => [r.eventKind, Number(r.weight)]),
  );
  const buckets: Record<string, number> = {
    volunteer_hours: 0,
    approved_contribution: 0,
    opportunity_completed: 0,
    leadership_contribution: 0,
  };
  for (const event of events) {
    if (event.revokedAt) continue;
    const w = weights.get(event.kind) ?? 0;
    const points = Number(event.value) * w;
    if (event.kind in buckets) {
      buckets[event.kind] = (buckets[event.kind] ?? 0) + points;
    } else {
      buckets.approved_contribution = (buckets.approved_contribution ?? 0) + points;
    }
  }
  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  return {
    total: Math.round(total),
    volunteerContribution: Math.round(buckets.volunteer_hours ?? 0),
    approvedContributions: Math.round(buckets.approved_contribution ?? 0),
    leadership: Math.round(buckets.leadership_contribution ?? 0),
    initiatives: Math.round(buckets.opportunity_completed ?? 0),
  };
}

export async function listImpactTimeline(userId: string, page = 1, pageSize = 30) {
  const limit = Math.min(50, Math.max(1, pageSize));
  const offset = (Math.max(1, page) - 1) * limit;
  const db = getDb();
  const events = await db.query.impactEvents.findMany({
    where: eq(impactEvents.userId, userId),
    orderBy: (f, { desc: d }) => [d(f.createdAt)],
    limit,
    offset,
  });
  return events.map((e) => ({
    id: e.id,
    kind: e.kind,
    value: Number(e.value),
    revoked: Boolean(e.revokedAt),
    createdAt: e.createdAt.toISOString(),
  }));
}

// ─── Badges ──────────────────────────────────────────────────────────────────

async function uniqueBadgeCode() {
  const db = getDb();
  for (let i = 0; i < 8; i += 1) {
    const code = generateRecognitionPublicCode({
      prefix: "BDG",
      year: new Date().getFullYear(),
      entropy: randomBytes(8),
    });
    const existing = await db.query.badgeAwards.findFirst({
      where: eq(badgeAwards.publicCode, code),
    });
    if (!existing) return code;
  }
  throw new RecognitionError("badge_code_exhausted");
}

export async function awardBadge(input: {
  actorUserId: string | null;
  badgeSlug: string;
  userId: string;
  reason: string;
  sourceType?: string;
  sourceId?: string;
  automatic?: boolean;
  requestId?: string | null;
}) {
  if (!input.automatic) {
    await requirePermission(input.actorUserId!, "badge.issue");
    if (input.actorUserId === input.userId) {
      throw new AuthorizationError("cannot award self badge");
    }
  }
  const db = getDb();
  const def = await db.query.badgeDefinitions.findFirst({
    where: eq(badgeDefinitions.slug, input.badgeSlug),
  });
  if (!def || !def.isActive) throw new RecognitionError("badge_definition_inactive");
  if (input.automatic && def.issuanceMode === "manual") {
    throw new AuthorizationError("automatic issuance not allowed for this badge");
  }
  const existing = await db.query.badgeAwards.findFirst({
    where: and(
      eq(badgeAwards.badgeDefinitionId, def.id),
      eq(badgeAwards.userId, input.userId),
      eq(badgeAwards.status, "active"),
    ),
  });
  if (existing) return existing.id;

  const id = uuidv7();
  const publicCode = await uniqueBadgeCode();
  await db.insert(badgeAwards).values({
    id,
    badgeDefinitionId: def.id,
    userId: input.userId,
    publicCode,
    status: "active",
    issuedAt: new Date(),
    issuerUserId: input.actorUserId,
    sourceType: input.sourceType ?? (input.automatic ? "automatic" : "manual"),
    sourceId: input.sourceId ?? null,
    reason: input.reason,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "BADGE_AWARDED",
    resourceType: "badge_award",
    resourceId: id,
    after: { slug: input.badgeSlug, userId: input.userId },
    requestId: input.requestId,
  });
  if (!input.automatic) {
    const { notifyDomainEvent } = await import("@/modules/notifications");
    await notifyDomainEvent({
      eventType: "BADGE_AWARDED",
      recipientUserId: input.userId,
      variables: { badgeName: def.nameEn },
      linkPath: "/account/contributions",
      idempotencyKey: `badge-awarded:${id}`,
    });
  }
  return id;
}

export async function revokeBadge(input: {
  actorUserId: string;
  awardId: string;
  reason: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "badge.revoke");
  const db = getDb();
  const award = await db.query.badgeAwards.findFirst({
    where: eq(badgeAwards.id, input.awardId),
  });
  if (!award) throw new RecognitionError("badge_award_not_found");
  await db
    .update(badgeAwards)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(badgeAwards.id, input.awardId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "BADGE_REVOKED",
    resourceType: "badge_award",
    resourceId: input.awardId,
    reason: input.reason,
    requestId: input.requestId,
  });
}

export async function evaluateAutomaticBadges(userId: string) {
  const db = getDb();
  const defs = await db.query.badgeDefinitions.findMany({
    where: and(eq(badgeDefinitions.isActive, true), eq(badgeDefinitions.issuanceMode, "automatic")),
  });
  const approvedHours = await getApprovedHoursForUser(userId);
  const [completedRow] = await db
    .select({ total: count() })
    .from(volunteerParticipations)
    .where(
      and(
        eq(volunteerParticipations.userId, userId),
        eq(volunteerParticipations.status, "completed"),
      ),
    );
  const completed = Number(completedRow?.total ?? 0);
  const [contribRow] = await db
    .select({ total: count() })
    .from(contributions)
    .where(and(eq(contributions.userId, userId), eq(contributions.status, "approved")));
  const approvedContributions = Number(contribRow?.total ?? 0);

  for (const def of defs) {
    const criteria = (def.criteria ?? {}) as {
      minApprovedHours?: number;
      minCompletedOpportunities?: number;
      minApprovedContributions?: number;
      requiresManualApproval?: boolean;
    };
    if (criteria.requiresManualApproval) continue;
    const meets =
      (criteria.minApprovedHours ?? 0) <= approvedHours &&
      (criteria.minCompletedOpportunities ?? 0) <= completed &&
      (criteria.minApprovedContributions ?? 0) <= approvedContributions;
    if (meets) {
      await awardBadge({
        actorUserId: null,
        badgeSlug: def.slug,
        userId,
        reason: "automatic_eligibility",
        automatic: true,
      });
    }
  }
  await evaluateHourMilestones(userId, approvedHours);
}

export async function evaluateHourMilestones(userId: string, approvedHours: number) {
  const db = getDb();
  const definitions = await db.query.milestoneDefinitions.findMany({
    where: and(
      eq(milestoneDefinitions.kind, "volunteer_hours"),
      eq(milestoneDefinitions.isEnabled, true),
    ),
    orderBy: (f, { asc }) => [asc(f.sortOrder), asc(f.threshold)],
  });
  const thresholds =
    definitions.length > 0
      ? definitions.map((d) => d.threshold)
      : [...VOLUNTEER_HOUR_MILESTONES];
  for (const threshold of thresholds) {
    if (approvedHours < threshold) continue;
    const existing = await db.query.memberMilestones.findFirst({
      where: and(
        eq(memberMilestones.userId, userId),
        eq(memberMilestones.kind, "volunteer_hours"),
        eq(memberMilestones.threshold, threshold),
      ),
    });
    if (existing) continue;
    await db.insert(memberMilestones).values({
      id: uuidv7(),
      userId,
      kind: "volunteer_hours",
      threshold,
      achievedAt: new Date(),
      sourceTotal: String(approvedHours),
    });
  }
}

/** Badge awards never grant RBAC permissions. */
export async function badgeDoesNotGrantRbac(userId: string): Promise<boolean> {
  const perms = await getPermissionsForUser(userId);
  const privileged = [
    "volunteer.hours.review",
    "volunteer.application.review",
    "admin.dashboard.read",
    "badge.issue",
  ];
  // Having a badge award does not by itself add permissions — caller checks awards separately.
  void userId;
  return !privileged.every((p) => perms.includes(p));
}

export async function verifyBadgePublicCode(publicCode: string) {
  const db = getDb();
  const award = await db.query.badgeAwards.findFirst({
    where: eq(badgeAwards.publicCode, publicCode.toUpperCase()),
  });
  if (!award) return null;
  const def = await db.query.badgeDefinitions.findFirst({
    where: eq(badgeDefinitions.id, award.badgeDefinitionId),
  });
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, award.userId),
  });
  let status = award.status;
  if (award.revokedAt) status = "revoked";
  else if (award.expiresAt && award.expiresAt < new Date()) status = "expired";
  return {
    verified: status === "active",
    publicCode: award.publicCode!,
    status: status.toUpperCase(),
    nameAr: def?.nameAr ?? "",
    nameEn: def?.nameEn ?? "",
    criteriaAr: def?.criteriaAr ?? null,
    criteriaEn: def?.criteriaEn ?? null,
    recipientNameAr: profile?.displayNameAr ?? "",
    recipientNameEn: profile?.displayNameEn ?? null,
    issuedAt: award.issuedAt.toISOString(),
    issuerName: def?.issuerName ?? "Strategy & Execution Clinic",
  };
}

// ─── Certificates ────────────────────────────────────────────────────────────

async function uniqueCertificateCode() {
  const db = getDb();
  for (let i = 0; i < 8; i += 1) {
    const code = generateRecognitionPublicCode({
      prefix: "CRT",
      year: new Date().getFullYear(),
      entropy: randomBytes(8),
    });
    const existing = await db.query.certificates.findFirst({
      where: eq(certificates.publicCode, code),
    });
    if (!existing) return code;
  }
  throw new RecognitionError("certificate_code_exhausted");
}

export async function issueCertificate(input: {
  actorUserId: string;
  definitionSlug: string;
  userId: string;
  sourceType: string;
  sourceId: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "certificate.issue");
  const db = getDb();
  const def = await db.query.certificateDefinitions.findFirst({
    where: eq(certificateDefinitions.slug, input.definitionSlug),
  });
  if (!def || !def.isActive) throw new RecognitionError("certificate_definition_inactive");

  if (input.sourceType === "contribution") {
    const contrib = await db.query.contributions.findFirst({
      where: eq(contributions.id, input.sourceId),
    });
    if (!contrib || contrib.status !== "approved" || contrib.userId !== input.userId) {
      throw new RecognitionError("invalid_certificate_source");
    }
  } else if (input.sourceType === "badge") {
    const award = await db.query.badgeAwards.findFirst({
      where: eq(badgeAwards.id, input.sourceId),
    });
    if (!award || award.status !== "active" || award.userId !== input.userId) {
      throw new RecognitionError("invalid_certificate_source");
    }
  } else if (input.sourceType === "membership") {
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.id, input.sourceId),
    });
    if (!membership || membership.status !== "active" || membership.userId !== input.userId) {
      throw new RecognitionError("invalid_certificate_source");
    }
  } else {
    throw new RecognitionError("invalid_certificate_source");
  }

  const existing = await db.query.certificates.findFirst({
    where: and(
      eq(certificates.definitionId, def.id),
      eq(certificates.sourceType, input.sourceType),
      eq(certificates.sourceId, input.sourceId),
    ),
  });
  if (existing) return existing.id;

  const id = uuidv7();
  const publicCode = await uniqueCertificateCode();
  await db.insert(certificates).values({
    id,
    definitionId: def.id,
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    publicCode,
    status: "active",
    issuedAt: new Date(),
    issuedBy: input.actorUserId,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "CERTIFICATE_ISSUED",
    resourceType: "certificate",
    resourceId: id,
    requestId: input.requestId,
  });
  const { notifyDomainEvent } = await import("@/modules/notifications");
  await notifyDomainEvent({
    eventType: "CERTIFICATE_ISSUED",
    recipientUserId: input.userId,
    linkPath: "/account/contributions",
    idempotencyKey: `certificate-issued:${id}`,
  });
  return id;
}

export async function revokeCertificate(input: {
  actorUserId: string;
  certificateId: string;
  reason: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "certificate.revoke");
  const db = getDb();
  await db
    .update(certificates)
    .set({ status: "revoked", revokedAt: new Date(), revokeReason: input.reason })
    .where(eq(certificates.id, input.certificateId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "CERTIFICATE_REVOKED",
    resourceType: "certificate",
    resourceId: input.certificateId,
    reason: input.reason,
    requestId: input.requestId,
  });
}

export async function verifyCertificatePublicCode(publicCode: string) {
  const db = getDb();
  const cert = await db.query.certificates.findFirst({
    where: eq(certificates.publicCode, publicCode.toUpperCase()),
  });
  if (!cert) return null;
  const def = await db.query.certificateDefinitions.findFirst({
    where: eq(certificateDefinitions.id, cert.definitionId),
  });
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, cert.userId),
  });
  let status = cert.status;
  if (cert.revokedAt) status = "revoked";
  else if (cert.expiresAt && cert.expiresAt < new Date()) status = "expired";
  return {
    verified: status === "active",
    publicCode: cert.publicCode,
    status: status.toUpperCase(),
    titleAr: def?.titleAr ?? "",
    titleEn: def?.titleEn ?? "",
    recipientNameAr: profile?.displayNameAr ?? "",
    recipientNameEn: profile?.displayNameEn ?? null,
    issuedAt: cert.issuedAt.toISOString(),
    wordingAr:
      "تشهد عيادة الاستراتيجية والتنفيذ بأن المستفيد قد حقق متطلبات الإنجاز وفق السجل المعتمد لدى العيادة.",
    wordingEn:
      "Strategy & Execution Clinic certifies that the recipient has met the achievement requirements according to the Clinic’s authoritative record.",
  };
}

export async function getCertificateForExport(certificateId: string, actorUserId: string) {
  const db = getDb();
  const cert = await db.query.certificates.findFirst({
    where: eq(certificates.id, certificateId),
  });
  if (!cert) throw new RecognitionError("certificate_not_found");
  if (cert.userId === actorUserId) {
    await requirePermission(actorUserId, "certificate.read.own");
    return cert;
  }
  await requirePermission(actorUserId, "certificate.read.any");
  return cert;
}

// ─── Public profile / directory ──────────────────────────────────────────────

export async function getOrCreatePublicProfileSettings(userId: string) {
  const db = getDb();
  let settings = await db.query.publicProfileSettings.findFirst({
    where: eq(publicProfileSettings.userId, userId),
  });
  if (!settings) {
    const id = uuidv7();
    await db.insert(publicProfileSettings).values({ id, userId });
    settings = await db.query.publicProfileSettings.findFirst({
      where: eq(publicProfileSettings.userId, userId),
    });
  }
  return settings!;
}

export async function updatePublicProfileSettings(input: {
  actorUserId: string;
  patch: Partial<{
    showPhoto: boolean;
    showHeadline: boolean;
    showBiography: boolean;
    showTracks: boolean;
    showVolunteerHours: boolean;
    showImpactScore: boolean;
    showContributions: boolean;
    showBadges: boolean;
    showCertificates: boolean;
    publicHandle: string | null;
  }>;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "directory.profile.manage.own");
  const settings = await getOrCreatePublicProfileSettings(input.actorUserId);
  const db = getDb();
  let handle = input.patch.publicHandle;
  if (handle != null) {
    handle = handle.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (handle.length < 3 || RESERVED_HANDLES.has(handle)) {
      throw new RecognitionError("invalid_public_handle");
    }
    const taken = await db.query.publicProfileSettings.findFirst({
      where: eq(publicProfileSettings.publicHandle, handle),
    });
    if (taken && taken.userId !== input.actorUserId) {
      throw new RecognitionError("invalid_public_handle");
    }
  }
  await db
    .update(publicProfileSettings)
    .set({
      showPhoto: input.patch.showPhoto ?? settings.showPhoto,
      showHeadline: input.patch.showHeadline ?? settings.showHeadline,
      showBiography: input.patch.showBiography ?? settings.showBiography,
      showTracks: input.patch.showTracks ?? settings.showTracks,
      showVolunteerHours: input.patch.showVolunteerHours ?? settings.showVolunteerHours,
      showImpactScore: input.patch.showImpactScore ?? settings.showImpactScore,
      showContributions: input.patch.showContributions ?? settings.showContributions,
      showBadges: input.patch.showBadges ?? settings.showBadges,
      showCertificates: input.patch.showCertificates ?? settings.showCertificates,
      publicHandle: handle === undefined ? settings.publicHandle : handle,
      updatedAt: new Date(),
    })
    .where(eq(publicProfileSettings.userId, input.actorUserId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "PUBLIC_PROFILE_VISIBILITY_UPDATED",
    resourceType: "public_profile_settings",
    resourceId: settings.id,
    requestId: input.requestId,
  });
}

export type PublicMemberProfileDto = {
  displayNameAr: string;
  displayNameEn: string | null;
  headlineAr: string | null;
  headlineEn: string | null;
  bioAr: string | null;
  bioEn: string | null;
  photoUrl: string | null;
  membershipTypes: { nameAr: string; nameEn: string; status: string }[];
  tracks: { nameAr: string; nameEn: string }[];
  memberSinceYear: number | null;
  credentialPublicCode: string | null;
  approvedVolunteerHours: number | null;
  progressionLevel: string | null;
  impactScore: number | null;
  contributions: { titleAr: string; titleEn: string; kind: string }[];
  badges: { nameAr: string; nameEn: string; publicCode: string | null }[];
  certificates: { titleAr: string; titleEn: string; publicCode: string }[];
};

export function publicMemberProfileLeaksPrivate(dto: object): boolean {
  const serialized = JSON.stringify(dto);
  return ["email", "phone", "adminNotes", "internalUserId", "userId", "reviewNotes"].some((k) =>
    serialized.includes(`"${k}"`),
  );
}

export async function getPublicMemberProfileByCredentialCode(
  publicCode: string,
): Promise<PublicMemberProfileDto | null> {
  const db = getDb();
  const credential = await db.query.credentials.findFirst({
    where: eq(credentials.publicCode, publicCode.toUpperCase()),
  });
  if (!credential) return null;
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.id, credential.membershipId),
  });
  if (!membership) return null;
  return buildPublicMemberProfile(membership.userId, credential.publicCode);
}

export async function getPublicMemberProfileByHandle(
  handle: string,
): Promise<PublicMemberProfileDto | null> {
  const db = getDb();
  const settings = await db.query.publicProfileSettings.findFirst({
    where: eq(publicProfileSettings.publicHandle, handle.toLowerCase()),
  });
  if (!settings) return null;
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, settings.userId), eq(memberships.status, "active")),
  });
  let code: string | null = null;
  if (membership) {
    const cred = await db.query.credentials.findFirst({
      where: eq(credentials.membershipId, membership.id),
    });
    code = cred?.publicCode ?? null;
  }
  return buildPublicMemberProfile(settings.userId, code);
}

async function buildPublicMemberProfile(
  userId: string,
  credentialPublicCode: string | null,
): Promise<PublicMemberProfileDto> {
  const db = getDb();
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  const settings = await getOrCreatePublicProfileSettings(userId);
  const membershipRows = await db.query.memberships.findMany({
    where: eq(memberships.userId, userId),
  });
  const typeIds = membershipRows.map((m) => m.membershipTypeId);
  const types =
    typeIds.length === 0
      ? []
      : await db.query.membershipTypes.findMany({
          where: inArray(membershipTypes.id, typeIds),
        });
  const typeMap = new Map(types.map((t) => [t.id, t]));

  const trackLinks =
    membershipRows.length === 0
      ? []
      : await db.query.memberTracks.findMany({
          where: inArray(
            memberTracks.membershipId,
            membershipRows.map((m) => m.id),
          ),
        });
  const trackRows =
    trackLinks.length === 0
      ? []
      : await db.query.tracks.findMany({
          where: inArray(
            tracks.id,
            trackLinks.map((l) => l.trackId),
          ),
        });

  const volunteer = await db.query.volunteerProfiles.findFirst({
    where: eq(volunteerProfiles.userId, userId),
  });
  const hours = settings.showVolunteerHours ? await getApprovedHoursForUser(userId) : null;

  const contribRows = settings.showContributions
    ? await db.query.contributions.findMany({
        where: and(
          eq(contributions.userId, userId),
          eq(contributions.status, "approved"),
          eq(contributions.visibility, "public"),
        ),
        limit: 20,
      })
    : [];

  const awards = settings.showBadges
    ? await db.query.badgeAwards.findMany({
        where: and(eq(badgeAwards.userId, userId), eq(badgeAwards.status, "active")),
        limit: 20,
      })
    : [];
  const badgeDefs =
    awards.length === 0
      ? []
      : await db.query.badgeDefinitions.findMany({
          where: inArray(
            badgeDefinitions.id,
            awards.map((a) => a.badgeDefinitionId),
          ),
        });
  const badgeMap = new Map(badgeDefs.map((b) => [b.id, b]));

  const certRows = settings.showCertificates
    ? await db.query.certificates.findMany({
        where: and(eq(certificates.userId, userId), eq(certificates.status, "active")),
        limit: 20,
      })
    : [];
  const certDefs =
    certRows.length === 0
      ? []
      : await db.query.certificateDefinitions.findMany({
          where: inArray(
            certificateDefinitions.id,
            certRows.map((c) => c.definitionId),
          ),
        });
  const certMap = new Map(certDefs.map((c) => [c.id, c]));

  const activeMembership = membershipRows.find((m) => m.status === "active");

  return {
    displayNameAr: profile?.displayNameAr ?? "",
    displayNameEn: profile?.displayNameEn ?? null,
    headlineAr: settings.showHeadline ? profile?.headlineAr ?? null : null,
    headlineEn: settings.showHeadline ? profile?.headlineEn ?? null : null,
    bioAr: settings.showBiography ? profile?.bioAr ?? null : null,
    bioEn: settings.showBiography ? profile?.bioEn ?? null : null,
    photoUrl: settings.showPhoto ? null : null,
    membershipTypes: membershipRows.map((m) => ({
      nameAr: typeMap.get(m.membershipTypeId)?.nameAr ?? "",
      nameEn: typeMap.get(m.membershipTypeId)?.nameEn ?? "",
      status: m.status,
    })),
    tracks: settings.showTracks
      ? trackRows.map((t) => ({ nameAr: t.nameAr, nameEn: t.nameEn }))
      : [],
    memberSinceYear: activeMembership?.startsAt.getFullYear() ?? null,
    credentialPublicCode,
    approvedVolunteerHours: hours,
    progressionLevel: volunteer?.progressionLevel ?? null,
    impactScore: settings.showImpactScore ? volunteer?.impactScoreCache ?? null : null,
    contributions: contribRows.map((c) => ({
      titleAr: c.titleAr,
      titleEn: c.titleEn,
      kind: c.kind,
    })),
    badges: awards.map((a) => ({
      nameAr: badgeMap.get(a.badgeDefinitionId)?.nameAr ?? "",
      nameEn: badgeMap.get(a.badgeDefinitionId)?.nameEn ?? "",
      publicCode: a.publicCode,
    })),
    certificates: certRows.map((c) => ({
      titleAr: certMap.get(c.definitionId)?.titleAr ?? "",
      titleEn: certMap.get(c.definitionId)?.titleEn ?? "",
      publicCode: c.publicCode,
    })),
  };
}

export async function listDirectoryMembers(input: {
  q?: string;
  page?: number;
  pageSize?: number;
  clientKey?: string;
}) {
  await consumeRateLimit({
    key: `directory:${input.clientKey ?? "anon"}`,
    limit: 90,
    windowMs: 60_000,
  });
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(40, Math.max(1, input.pageSize ?? 12));
  const db = getDb();
  const needle = input.q?.trim().replace(/[%_]/g, "") ?? "";
  const rows = await db.query.profiles.findMany({
    where: and(
      eq(profiles.directoryOptIn, true),
      eq(profiles.visibility, "public"),
      needle
        ? or(
            ilike(profiles.displayNameAr, `%${needle}%`),
            ilike(profiles.displayNameEn, `%${needle}%`),
            ilike(profiles.headlineAr, `%${needle}%`),
            ilike(profiles.headlineEn, `%${needle}%`),
          )
        : undefined,
    ),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const userIds = rows.map((p) => p.userId);
  const membershipRows =
    userIds.length === 0
      ? []
      : await db.query.memberships.findMany({
          where: and(inArray(memberships.userId, userIds), eq(memberships.status, "active")),
        });
  const membershipByUser = new Map(membershipRows.map((m) => [m.userId, m]));
  const membershipIds = membershipRows.map((m) => m.id);
  const creds =
    membershipIds.length === 0
      ? []
      : await db.query.credentials.findMany({
          where: inArray(credentials.membershipId, membershipIds),
        });
  const credByMembership = new Map(creds.map((c) => [c.membershipId, c]));
  const results = rows.map((p) => {
    const membership = membershipByUser.get(p.userId);
    const publicCode = membership
      ? (credByMembership.get(membership.id)?.publicCode ?? null)
      : null;
    return {
      displayNameAr: p.displayNameAr,
      displayNameEn: p.displayNameEn,
      headlineAr: p.headlineAr,
      headlineEn: p.headlineEn,
      publicCode,
    };
  });
  return { items: results, page, pageSize };
}

export async function listImpactRulesForAdmin() {
  const db = getDb();
  return db.query.impactRules.findMany({
    orderBy: (f, { asc }) => [asc(f.eventKind)],
  });
}

export async function updateImpactWeight(input: {
  actorUserId: string;
  eventKind: string;
  weight: number;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "impact.config.manage");
  if (!Number.isFinite(input.weight) || input.weight < 0 || input.weight > 1000) {
    throw new RecognitionError("invalid_impact_weight");
  }
  const db = getDb();
  const rule = await db.query.impactRules.findFirst({
    where: eq(impactRules.eventKind, input.eventKind),
  });
  if (!rule) throw new RecognitionError("impact_rule_not_found");
  await db
    .update(impactRules)
    .set({ weight: String(input.weight), updatedAt: new Date() })
    .where(eq(impactRules.id, rule.id));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "IMPACT_CONFIG_UPDATED",
    resourceType: "impact_rule",
    resourceId: rule.id,
    after: { eventKind: input.eventKind, weight: input.weight },
    requestId: input.requestId,
  });
}

export async function listMilestoneDefinitionsForAdmin() {
  const db = getDb();
  return db.query.milestoneDefinitions.findMany({
    orderBy: (f, { asc }) => [asc(f.sortOrder), asc(f.threshold)],
  });
}

export async function updateMilestoneDefinition(input: {
  actorUserId: string;
  milestoneId: string;
  patch: {
    isEnabled?: boolean;
    threshold?: number;
    nameAr?: string;
    nameEn?: string;
    sortOrder?: number;
  };
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "milestone.config.manage");
  const db = getDb();
  const row = await db.query.milestoneDefinitions.findFirst({
    where: eq(milestoneDefinitions.id, input.milestoneId),
  });
  if (!row) throw new RecognitionError("milestone_not_found");

  const threshold = input.patch.threshold ?? row.threshold;
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 10_000) {
    throw new RecognitionError("invalid_milestone_threshold");
  }
  const nameAr = input.patch.nameAr?.trim() ?? row.nameAr;
  const nameEn = input.patch.nameEn?.trim() ?? row.nameEn;
  if (!nameAr || !nameEn) throw new RecognitionError("invalid_milestone_label");
  const sortOrder = input.patch.sortOrder ?? row.sortOrder;
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10_000) {
    throw new RecognitionError("invalid_milestone_sort_order");
  }
  const isEnabled = input.patch.isEnabled ?? row.isEnabled;

  if (threshold !== row.threshold) {
    const conflict = await db.query.milestoneDefinitions.findFirst({
      where: and(
        eq(milestoneDefinitions.kind, row.kind),
        eq(milestoneDefinitions.threshold, threshold),
      ),
    });
    if (conflict && conflict.id !== row.id) {
      throw new RecognitionError("milestone_threshold_conflict");
    }
  }

  const before = {
    threshold: row.threshold,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    isEnabled: row.isEnabled,
    sortOrder: row.sortOrder,
  };
  await db
    .update(milestoneDefinitions)
    .set({
      threshold,
      nameAr,
      nameEn,
      isEnabled,
      sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(milestoneDefinitions.id, row.id));

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "MILESTONE_CONFIG_UPDATED",
    resourceType: "milestone_definition",
    resourceId: row.id,
    before,
    after: { threshold, nameAr, nameEn, isEnabled, sortOrder },
    requestId: input.requestId,
  });
}

export async function listContributionTypes() {
  const db = getDb();
  return db.query.contributionTypes.findMany({
    where: eq(contributionTypes.isActive, true),
    orderBy: (f, { asc }) => [asc(f.sortOrder)],
  });
}

export async function listBadgeDefinitions() {
  const db = getDb();
  return db.query.badgeDefinitions.findMany({
    where: eq(badgeDefinitions.isActive, true),
  });
}

export async function listOwnBadges(userId: string) {
  await requirePermission(userId, "badge.read.own");
  const db = getDb();
  return db.query.badgeAwards.findMany({
    where: eq(badgeAwards.userId, userId),
    limit: 50,
  });
}

export async function listOwnCertificates(userId: string) {
  await requirePermission(userId, "certificate.read.own");
  const db = getDb();
  return db.query.certificates.findMany({
    where: eq(certificates.userId, userId),
    limit: 50,
  });
}

export async function getShareCardPayload(input: {
  kind: "badge" | "certificate";
  publicCode: string;
  locale: "ar" | "en";
}) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  if (input.kind === "badge") {
    const dto = await verifyBadgePublicCode(input.publicCode);
    if (!dto || !dto.verified) return null;
    const verificationUrl = `${base.replace(/\/$/, "")}/${input.locale}/badge/${encodeURIComponent(dto.publicCode)}`;
    return {
      title: input.locale === "ar" ? dto.nameAr : dto.nameEn,
      subtitle:
        input.locale === "ar"
          ? "شارة مهنية قابلة للتحقق"
          : "Verifiable professional badge",
      publicCode: dto.publicCode,
      verificationUrl,
      metricLabel: input.locale === "ar" ? dto.criteriaAr ?? "" : dto.criteriaEn ?? "",
      metricValue: dto.status,
    };
  }
  const dto = await verifyCertificatePublicCode(input.publicCode);
  if (!dto || !dto.verified) return null;
  const verificationUrl = `${base.replace(/\/$/, "")}/${input.locale}/certificate/${encodeURIComponent(dto.publicCode)}`;
  return {
    title: input.locale === "ar" ? dto.titleAr : dto.titleEn,
    subtitle:
      input.locale === "ar" ? "شهادة إنجاز معتمدة" : "Authoritative achievement certificate",
    publicCode: dto.publicCode,
    verificationUrl,
    metricLabel: dto.status,
    metricValue: input.locale === "ar" ? "شهادة" : "Certificate",
  };
}

export type { ContributionStatus };
