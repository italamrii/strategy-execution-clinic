import { eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { consumeRateLimit } from "@/modules/identity/rate-limit";
import { requirePermission } from "@/modules/identity";
import { getApprovedHoursForUser } from "@/modules/volunteering/service";
import { getDb } from "@/shared/db/client";
import {
  credentialStatusHistory,
  credentials,
  memberTracks,
  membershipTypes,
  memberships,
  profiles,
  tracks,
} from "@/shared/db/schema";
import { CredentialError } from "./errors";
import { generatePublicMembershipCode, isValidPublicCodeFormat } from "./public-code";
import {
  toPublicVerificationDto,
  type PublicVerificationDto,
  type VerificationSource,
} from "./public-dto";
import {
  CARD_DESIGN_VERSION,
  effectiveCredentialStatus,
  mapMembershipStatusToCredential,
  toPublicCredentialStatus,
  type CredentialDbStatus,
} from "./states";

async function generateUniquePublicCode(typeCode: string, year: number): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generatePublicMembershipCode({
      typeCode,
      year,
      entropy: randomBytes(8),
    });
    const existing = await db.query.credentials.findFirst({
      where: eq(credentials.publicCode, code),
    });
    if (!existing) {
      return code;
    }
  }
  throw new CredentialError("public_code_collision");
}

async function writeCredentialHistory(input: {
  credentialId: string;
  fromStatus: string;
  toStatus: string;
  actorId?: string | null;
  reason?: string | null;
  source?: string | null;
}) {
  const db = getDb();
  await db.insert(credentialStatusHistory).values({
    id: uuidv7(),
    credentialId: input.credentialId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    actorId: input.actorId ?? null,
    reason: input.reason ?? null,
    source: input.source ?? null,
  });
}

export async function issueCredentialForMembership(input: {
  membershipId: string;
  actorUserId?: string | null;
  issuanceSource: string;
  requestId?: string | null;
  auditAction?: "CREDENTIAL_ISSUED" | "CREDENTIAL_BACKFILLED";
}): Promise<string> {
  const db = getDb();
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.id, input.membershipId),
  });
  if (!membership) {
    throw new CredentialError("membership_not_found");
  }
  if (membership.status !== "active") {
    throw new CredentialError("membership_not_active");
  }

  const existing = await db.query.credentials.findFirst({
    where: eq(credentials.membershipId, input.membershipId),
  });
  if (existing) {
    return existing.id;
  }

  const type = await db.query.membershipTypes.findFirst({
    where: eq(membershipTypes.id, membership.membershipTypeId),
  });
  if (!type) {
    throw new CredentialError("membership_type_not_found");
  }

  const now = new Date();
  const publicCode = await generateUniquePublicCode(type.code, now.getFullYear());
  const credentialId = uuidv7();

  await db.insert(credentials).values({
    id: credentialId,
    membershipId: membership.id,
    publicCode,
    status: "active",
    tokenVersion: 1,
    designVersion: CARD_DESIGN_VERSION,
    issuanceSource: input.issuanceSource,
    issuedAt: membership.issuedAt ?? now,
    expiresAt: membership.endsAt,
    createdBy: input.actorUserId ?? null,
  });

  await writeCredentialHistory({
    credentialId,
    fromStatus: "none",
    toStatus: "active",
    actorId: input.actorUserId ?? null,
    reason: input.issuanceSource,
    source: input.issuanceSource,
  });

  await writeAudit({
    actorUserId: input.actorUserId,
    action: input.auditAction ?? "CREDENTIAL_ISSUED",
    resourceType: "credential",
    resourceId: credentialId,
    requestId: input.requestId,
    after: { membershipId: membership.id, publicCode },
  });

  const { notifyDomainEvent } = await import("@/modules/notifications");
  await notifyDomainEvent({
    eventType: "CREDENTIAL_ISSUED",
    recipientUserId: membership.userId,
    variables: { credentialCode: publicCode },
    linkPath: "/account/credential",
    idempotencyKey: `credential-issued:${credentialId}`,
  });

  return credentialId;
}

export async function syncCredentialWithMembership(input: {
  membershipId: string;
  actorUserId?: string | null;
  reason?: string | null;
  source?: string | null;
}) {
  const db = getDb();
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.id, input.membershipId),
  });
  if (!membership) {
    return;
  }
  const credential = await db.query.credentials.findFirst({
    where: eq(credentials.membershipId, input.membershipId),
  });
  if (!credential) {
    if (membership.status === "active") {
      await issueCredentialForMembership({
        membershipId: membership.id,
        actorUserId: input.actorUserId,
        issuanceSource: input.source ?? "membership_sync",
      });
    }
    return;
  }

  const next = mapMembershipStatusToCredential(membership.status);
  if (credential.status === next) {
    return;
  }

  const from = credential.status;
  await db
    .update(credentials)
    .set({
      status: next,
      suspendedAt: next === "suspended" ? new Date() : credential.suspendedAt,
      revokedAt: next === "revoked" ? new Date() : credential.revokedAt,
      revokeReason: input.reason ?? credential.revokeReason,
      updatedAt: new Date(),
    })
    .where(eq(credentials.id, credential.id));

  await writeCredentialHistory({
    credentialId: credential.id,
    fromStatus: from,
    toStatus: next,
    actorId: input.actorUserId ?? null,
    reason: input.reason,
    source: input.source ?? "membership_lifecycle",
  });

  const auditMap: Record<string, string> = {
    suspended: "CREDENTIAL_SUSPENDED",
    revoked: "CREDENTIAL_REVOKED",
    active: "CREDENTIAL_REACTIVATED",
    expired: "CREDENTIAL_EXPIRED",
  };
  const action = auditMap[next];
  if (action) {
    await writeAudit({
      actorUserId: input.actorUserId,
      action,
      resourceType: "credential",
      resourceId: credential.id,
      reason: input.reason,
      before: { status: from },
      after: { status: next },
    });
  }

  if (next === "revoked") {
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.id, input.membershipId),
    });
    if (membership) {
      const { notifyDomainEvent } = await import("@/modules/notifications");
      await notifyDomainEvent({
        eventType: "CREDENTIAL_REVOKED",
        recipientUserId: membership.userId,
        linkPath: "/account/credential",
        idempotencyKey: `credential-revoked:${credential.id}`,
      });
    }
  }
}

export async function adminIssueCredential(input: {
  actorUserId: string;
  membershipId: string;
  reason: string;
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "credential.issue");
  if (!input.reason.trim()) {
    throw new CredentialError("reason_required");
  }
  return issueCredentialForMembership({
    membershipId: input.membershipId,
    actorUserId: input.actorUserId,
    issuanceSource: `manual:${input.reason}`,
    requestId: input.requestId,
  });
}

export async function adminSuspendCredential(input: {
  actorUserId: string;
  credentialId: string;
  reason: string;
}) {
  await requirePermission(input.actorUserId, "credential.suspend");
  return changeCredentialStatus({
    credentialId: input.credentialId,
    to: "suspended",
    actorUserId: input.actorUserId,
    reason: input.reason,
    auditAction: "CREDENTIAL_SUSPENDED",
  });
}

export async function adminRevokeCredential(input: {
  actorUserId: string;
  credentialId: string;
  reason: string;
}) {
  await requirePermission(input.actorUserId, "credential.revoke");
  return changeCredentialStatus({
    credentialId: input.credentialId,
    to: "revoked",
    actorUserId: input.actorUserId,
    reason: input.reason,
    auditAction: "CREDENTIAL_REVOKED",
  });
}

async function changeCredentialStatus(input: {
  credentialId: string;
  to: CredentialDbStatus;
  actorUserId: string;
  reason: string;
  auditAction: string;
}) {
  if (!input.reason.trim()) {
    throw new CredentialError("reason_required");
  }
  const db = getDb();
  const credential = await db.query.credentials.findFirst({
    where: eq(credentials.id, input.credentialId),
  });
  if (!credential) {
    throw new CredentialError("credential_not_found");
  }
  const from = credential.status;
  if (from === input.to) {
    return credential.id;
  }
  await db
    .update(credentials)
    .set({
      status: input.to,
      suspendedAt: input.to === "suspended" ? new Date() : credential.suspendedAt,
      revokedAt: input.to === "revoked" ? new Date() : credential.revokedAt,
      revokeReason: input.reason,
      updatedAt: new Date(),
    })
    .where(eq(credentials.id, credential.id));
  await writeCredentialHistory({
    credentialId: credential.id,
    fromStatus: from,
    toStatus: input.to,
    actorId: input.actorUserId,
    reason: input.reason,
    source: "admin",
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: input.auditAction,
    resourceType: "credential",
    resourceId: credential.id,
    reason: input.reason,
    before: { status: from },
    after: { status: input.to },
  });
  return credential.id;
}

export type OwnCredentialDto = {
  id: string;
  publicCode: string;
  status: CredentialDbStatus;
  effectiveStatus: CredentialDbStatus;
  membershipTypeSlug: string;
  membershipTypeAr: string;
  membershipTypeEn: string;
  tracks: Array<{ nameAr: string; nameEn: string; slug: string; iconKey?: string }>;
  primaryTrack: {
    slug: string;
    nameAr: string;
    nameEn: string;
    iconKey: string;
  } | null;
  isGroupLeader: boolean;
  issuedAt: string;
  expiresAt: string | null;
  memberNameAr: string;
  memberNameEn: string | null;
  verificationUrlAr: string;
  verificationUrlEn: string;
};

async function hydrateCredentialContext(credentialId: string) {
  const db = getDb();
  const credential = await db.query.credentials.findFirst({
    where: eq(credentials.id, credentialId),
  });
  if (!credential) {
    throw new CredentialError("credential_not_found");
  }
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.id, credential.membershipId),
  });
  if (!membership) {
    throw new CredentialError("membership_not_found");
  }
  const type = await db.query.membershipTypes.findFirst({
    where: eq(membershipTypes.id, membership.membershipTypeId),
  });
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, membership.userId),
  });
  const links = await db.query.memberTracks.findMany({
    where: eq(memberTracks.membershipId, membership.id),
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
  return { credential, membership, type, profile, trackRows };
}

export async function listOwnCredentials(actorUserId: string): Promise<OwnCredentialDto[]> {
  await requirePermission(actorUserId, "credential.read.own");
  const db = getDb();
  const rows = await db.query.memberships.findMany({
    where: eq(memberships.userId, actorUserId),
  });
  const out: OwnCredentialDto[] = [];
  for (const membership of rows) {
    const credential = await db.query.credentials.findFirst({
      where: eq(credentials.membershipId, membership.id),
    });
    if (!credential) {
      continue;
    }
    const ctx = await hydrateCredentialContext(credential.id);
    const effective = effectiveCredentialStatus({
      credentialStatus: credential.status as CredentialDbStatus,
      membershipStatus: membership.status,
      expiresAt: credential.expiresAt,
    });
    const { buildVerificationUrl } = await import("./qr");
    const { getVerifiedTrackIdentity } = await import("@/modules/tracks");
    const identity = await getVerifiedTrackIdentity(actorUserId);
    const operational = [
      ...(identity.primaryTrack
        ? [
            {
              nameAr: identity.primaryTrack.nameAr,
              nameEn: identity.primaryTrack.nameEn,
              slug: identity.primaryTrack.slug,
              iconKey: identity.primaryTrack.iconKey,
            },
          ]
        : []),
      ...identity.secondaryTracks
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .map((t) => ({
          nameAr: t.nameAr,
          nameEn: t.nameEn,
          slug: t.slug,
          iconKey: t.iconKey,
        })),
    ];
    out.push({
      id: credential.id,
      publicCode: credential.publicCode,
      status: credential.status as CredentialDbStatus,
      effectiveStatus: effective,
      membershipTypeSlug: ctx.type?.slug ?? "professional_member",
      membershipTypeAr: ctx.type?.nameAr ?? "",
      membershipTypeEn: ctx.type?.nameEn ?? "",
      tracks:
        operational.length > 0
          ? operational
          : ctx.trackRows.map((t) => ({
              nameAr: t.nameAr,
              nameEn: t.nameEn,
              slug: t.slug,
              iconKey: t.iconKey,
            })),
      primaryTrack: identity.primaryTrack
        ? {
            slug: identity.primaryTrack.slug,
            nameAr: identity.primaryTrack.nameAr,
            nameEn: identity.primaryTrack.nameEn,
            iconKey: identity.primaryTrack.iconKey,
          }
        : null,
      isGroupLeader: identity.isGroupLeader,
      issuedAt: credential.issuedAt.toISOString(),
      expiresAt: credential.expiresAt?.toISOString() ?? null,
      memberNameAr: ctx.profile?.displayNameAr ?? "",
      memberNameEn: ctx.profile?.displayNameEn ?? null,
      verificationUrlAr: buildVerificationUrl(credential.publicCode, "ar"),
      verificationUrlEn: buildVerificationUrl(credential.publicCode, "en"),
    });
  }
  return out;
}

export async function assertOwnCredential(actorUserId: string, credentialId: string) {
  await requirePermission(actorUserId, "credential.read.own");
  const ctx = await hydrateCredentialContext(credentialId);
  if (ctx.membership.userId !== actorUserId) {
    throw new CredentialError("forbidden");
  }
  return ctx;
}

export async function verifyPublicCode(input: {
  publicCode: string;
  locale: "ar" | "en";
  ip?: string | null;
  skipRateLimit?: boolean;
}): Promise<PublicVerificationDto | null> {
  const normalized = input.publicCode.trim().toUpperCase();
  if (!isValidPublicCodeFormat(normalized)) {
    return null;
  }

  if (!input.skipRateLimit) {
    try {
      await consumeRateLimit({
        key: `verify:ip:${input.ip ?? "unknown"}`,
        limit: 120,
        windowMs: 60_000,
      });
      await consumeRateLimit({
        key: `verify:code:${normalized}`,
        limit: 60,
        windowMs: 60_000,
      });
    } catch {
      throw new CredentialError("rate_limited");
    }
  }

  const db = getDb();
  const credential = await db.query.credentials.findFirst({
    where: eq(credentials.publicCode, normalized),
  });
  if (!credential) {
    return null;
  }

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.id, credential.membershipId),
  });
  if (!membership) {
    return null;
  }
  const type = await db.query.membershipTypes.findFirst({
    where: eq(membershipTypes.id, membership.membershipTypeId),
  });
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, membership.userId),
  });
  const links = await db.query.memberTracks.findMany({
    where: eq(memberTracks.membershipId, membership.id),
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

  const effective = effectiveCredentialStatus({
    credentialStatus: credential.status as CredentialDbStatus,
    membershipStatus: membership.status,
    expiresAt: credential.expiresAt ?? membership.endsAt,
  });

  const approvedVolunteerHours = await getApprovedHoursForUser(membership.userId);
  const { getVerifiedTrackIdentity } = await import("@/modules/tracks");
  const trackIdentity = await getVerifiedTrackIdentity(membership.userId);
  const primaryTrack = trackIdentity.primaryTrack
    ? {
        slug: trackIdentity.primaryTrack.slug,
        nameAr: trackIdentity.primaryTrack.nameAr,
        nameEn: trackIdentity.primaryTrack.nameEn,
        iconKey: trackIdentity.primaryTrack.iconKey,
        role: "primary" as const,
      }
    : null;
  const operationalTracks = [
    ...(trackIdentity.primaryTrack
      ? [
          {
            nameAr: trackIdentity.primaryTrack.nameAr,
            nameEn: trackIdentity.primaryTrack.nameEn,
            slug: trackIdentity.primaryTrack.slug,
            iconKey: trackIdentity.primaryTrack.iconKey,
          },
        ]
      : []),
    ...trackIdentity.secondaryTracks
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => ({
        nameAr: t.nameAr,
        nameEn: t.nameEn,
        slug: t.slug,
        iconKey: t.iconKey,
      })),
  ];
  const catalogTracks = trackRows.map((t) => ({
    nameAr: t.nameAr,
    nameEn: t.nameEn,
    slug: t.slug,
    iconKey: t.iconKey,
  }));
  const trackBadges = [
    ...(primaryTrack
      ? [
          {
            nameAr: primaryTrack.nameAr,
            nameEn: primaryTrack.nameEn,
            slug: "track_primary_member",
          },
        ]
      : []),
    ...(trackIdentity.isGroupLeader
      ? [{ nameAr: "قائد المسار", nameEn: "Group Leader", slug: "track_group_leader" }]
      : []),
  ];

  const source: VerificationSource = {
    publicCode: credential.publicCode,
    status: toPublicCredentialStatus(effective),
    displayNameAr: profile?.displayNameAr ?? "",
    displayNameEn: profile?.displayNameEn ?? null,
    membershipTypeNameAr: type?.nameAr ?? "",
    membershipTypeNameEn: type?.nameEn ?? "",
    tracks: operationalTracks.length > 0 ? operationalTracks : catalogTracks,
    primaryTrack,
    isGroupLeader: trackIdentity.isGroupLeader,
    memberSinceYear: credential.issuedAt.getFullYear(),
    issuedAt: credential.issuedAt.toISOString(),
    approvedVolunteerHours: approvedVolunteerHours > 0 ? approvedVolunteerHours : null,
    hoursPublic: profile?.hoursPublic ?? false,
    badges: trackBadges,
    photoUrl: profile?.visibility === "public" ? null : null,
    email: profile?.displayNameAr,
    phone: undefined,
    adminNotes: undefined,
    internalUserId: membership.userId,
  };

  return toPublicVerificationDto(source);
}

export async function listCredentialsForAdmin(input: {
  actorUserId: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission(input.actorUserId, "credential.read.any");
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const db = getDb();
  const where = input.status ? eq(credentials.status, input.status) : undefined;
  const rows = await db.query.credentials.findMany({
    where,
    orderBy: (fields, { desc }) => [desc(fields.issuedAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  let items = rows;
  if (input.q?.trim()) {
    const needle = input.q.trim().toUpperCase();
    items = rows.filter((row) => row.publicCode.includes(needle));
  }
  return { items, page, pageSize };
}

export async function getCredentialForAdmin(input: {
  actorUserId: string;
  credentialId: string;
}) {
  await requirePermission(input.actorUserId, "credential.read.any");
  const ctx = await hydrateCredentialContext(input.credentialId);
  const { buildVerificationUrl } = await import("./qr");
  const effective = effectiveCredentialStatus({
    credentialStatus: ctx.credential.status as CredentialDbStatus,
    membershipStatus: ctx.membership.status,
    expiresAt: ctx.credential.expiresAt ?? ctx.membership.endsAt,
  });
  return {
    id: ctx.credential.id,
    publicCode: ctx.credential.publicCode,
    status: ctx.credential.status,
    effectiveStatus: effective,
    issuedAt: ctx.credential.issuedAt,
    membershipId: ctx.membership.id,
    membershipTypeAr: ctx.type?.nameAr ?? "",
    membershipTypeEn: ctx.type?.nameEn ?? "",
    memberNameAr: ctx.profile?.displayNameAr ?? "",
    memberNameEn: ctx.profile?.displayNameEn ?? null,
    verificationUrlAr: buildVerificationUrl(ctx.credential.publicCode, "ar"),
    verificationUrlEn: buildVerificationUrl(ctx.credential.publicCode, "en"),
  };
}

export async function getCredentialStatusHistory(input: {
  actorUserId: string;
  credentialId: string;
}) {
  await requirePermission(input.actorUserId, "credential.audit.read");
  const db = getDb();
  return db.query.credentialStatusHistory.findMany({
    where: eq(credentialStatusHistory.credentialId, input.credentialId),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit: 50,
  });
}

export async function backfillCredentials(input: {
  dryRun?: boolean;
  actorUserId?: string | null;
}): Promise<{ scanned: number; issued: number; skipped: number }> {
  const db = getDb();
  const activeMemberships = await db.query.memberships.findMany({
    where: eq(memberships.status, "active"),
  });
  let issued = 0;
  let skipped = 0;
  for (const membership of activeMemberships) {
    const existing = await db.query.credentials.findFirst({
      where: eq(credentials.membershipId, membership.id),
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    if (!input.dryRun) {
      await issueCredentialForMembership({
        membershipId: membership.id,
        actorUserId: input.actorUserId,
        issuanceSource: "backfill",
        auditAction: "CREDENTIAL_BACKFILLED",
      });
    }
    issued += 1;
  }
  return { scanned: activeMemberships.length, issued, skipped };
}

export { hydrateCredentialContext };
