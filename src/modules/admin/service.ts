import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { requirePermission } from "@/modules/identity";
import { FLAG_KEYS, type FlagKey } from "@/modules/platform/flags";
import { getDb } from "@/shared/db/client";
import {
  announcements,
  auditLogs,
  badgeAwards,
  certificates,
  consultationRequests,
  contributions,
  credentials,
  featureFlags,
  meetingRooms,
  membershipApplications,
  memberships,
  profiles,
  securityEvents,
  systemSettings,
  volunteerHourEntries,
  volunteerOpportunities,
  volunteerOpportunityApplications,
  volunteerProfiles,
} from "@/shared/db/schema";
import { countFailedNotifications } from "@/modules/notifications";

const PUBLIC_SETTINGS = [
  "clinic.display_name_ar",
  "clinic.display_name_en",
  "default.locale",
  "directory.enabled",
  "applications.enabled",
  "volunteer.enrollment.enabled",
  "public.verification.enabled",
] as const;

const RESERVED_FUTURE_FLAGS = new Set<FlagKey>([
  "EVENTS",
  "ORGANIZATIONS",
  "ASSESSMENTS",
  "AI",
  "PAYMENTS",
]);

export async function getAdminDashboardMetrics() {
  const db = getDb();
  const [
    activeMemberships,
    pendingApplications,
    activeVolunteers,
    openOpportunities,
    pendingVolunteerApplications,
    pendingHourApprovals,
    approvedContributions,
    activeBadges,
    certificatesIssued,
    failedNotifications,
    recentSecurityEvents,
    recentAuditActions,
    pendingConsultations,
    scheduledMeetings,
  ] = await Promise.all([
    db.select({ total: count() }).from(memberships).where(eq(memberships.status, "active")),
    db
      .select({ total: count() })
      .from(membershipApplications)
      .where(eq(membershipApplications.status, "submitted")),
    db
      .select({ total: count() })
      .from(volunteerProfiles)
      .where(eq(volunteerProfiles.status, "active")),
    db
      .select({ total: count() })
      .from(volunteerOpportunities)
      .where(eq(volunteerOpportunities.status, "published")),
    db
      .select({ total: count() })
      .from(volunteerOpportunityApplications)
      .where(eq(volunteerOpportunityApplications.status, "submitted")),
    db
      .select({ total: count() })
      .from(volunteerHourEntries)
      .where(eq(volunteerHourEntries.status, "pending")),
    db
      .select({ total: count() })
      .from(contributions)
      .where(eq(contributions.status, "approved")),
    db.select({ total: count() }).from(badgeAwards).where(eq(badgeAwards.status, "active")),
    db.select({ total: count() }).from(certificates).where(eq(certificates.status, "active")),
    countFailedNotifications(),
    db.query.securityEvents.findMany({ orderBy: [desc(securityEvents.createdAt)], limit: 5 }),
    db.query.auditLogs.findMany({ orderBy: [desc(auditLogs.createdAt)], limit: 8 }),
    db
      .select({ total: count() })
      .from(consultationRequests)
      .where(eq(consultationRequests.status, "submitted")),
    db
      .select({ total: count() })
      .from(meetingRooms)
      .where(eq(meetingRooms.status, "scheduled")),
  ]);

  return {
    members: {
      activeMemberships: Number(activeMemberships[0]?.total ?? 0),
      pendingApplications: Number(pendingApplications[0]?.total ?? 0),
    },
    volunteering: {
      activeVolunteers: Number(activeVolunteers[0]?.total ?? 0),
      openOpportunities: Number(openOpportunities[0]?.total ?? 0),
      pendingApplications: Number(pendingVolunteerApplications[0]?.total ?? 0),
      pendingHourApprovals: Number(pendingHourApprovals[0]?.total ?? 0),
    },
    recognition: {
      approvedContributions: Number(approvedContributions[0]?.total ?? 0),
      activeBadges: Number(activeBadges[0]?.total ?? 0),
      certificatesIssued: Number(certificatesIssued[0]?.total ?? 0),
    },
    operations: {
      failedNotifications,
      recentSecurityEvents,
      recentAuditActions,
    },
    consultations: {
      pending: Number(pendingConsultations[0]?.total ?? 0),
    },
    meetings: {
      scheduled: Number(scheduledMeetings[0]?.total ?? 0),
    },
  };
}

export async function getAnalyticsSummary(input: {
  actorUserId: string;
  from?: Date;
  to?: Date;
}) {
  await requirePermission(input.actorUserId, "analytics.read");
  const db = getDb();
  const from = input.from ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const to = input.to ?? new Date();
  const membershipGrowth = await db
    .select({
      day: sql<string>`date_trunc('day', ${memberships.createdAt})::date`,
      total: count(),
    })
    .from(memberships)
    .where(and(gte(memberships.createdAt, from), lte(memberships.createdAt, to)))
    .groupBy(sql`date_trunc('day', ${memberships.createdAt})::date`)
    .orderBy(sql`date_trunc('day', ${memberships.createdAt})::date`);
  const volunteerHours = await db
    .select({
      day: sql<string>`date_trunc('day', ${volunteerHourEntries.reviewedAt})::date`,
      total: sql<number>`coalesce(sum(${volunteerHourEntries.hours}), 0)`,
    })
    .from(volunteerHourEntries)
    .where(
      and(
        eq(volunteerHourEntries.status, "approved"),
        gte(volunteerHourEntries.reviewedAt, from),
        lte(volunteerHourEntries.reviewedAt, to),
      ),
    )
    .groupBy(sql`date_trunc('day', ${volunteerHourEntries.reviewedAt})::date`)
    .orderBy(sql`date_trunc('day', ${volunteerHourEntries.reviewedAt})::date`);
  const contributionApprovals = await db
    .select({ total: count() })
    .from(contributions)
    .where(
      and(
        eq(contributions.status, "approved"),
        gte(contributions.updatedAt, from),
        lte(contributions.updatedAt, to),
      ),
    );
  return {
    membershipGrowth,
    volunteerHours,
    contributionApprovals: Number(contributionApprovals[0]?.total ?? 0),
  };
}

export async function listAuditLogsForAdmin(input: {
  actorUserId: string;
  page?: number;
  action?: string;
  resourceType?: string;
  from?: Date;
  to?: Date;
}) {
  await requirePermission(input.actorUserId, "audit.read");
  const db = getDb();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = 25;
  const filters = [];
  if (input.action) filters.push(eq(auditLogs.action, input.action));
  if (input.resourceType) filters.push(eq(auditLogs.resourceType, input.resourceType));
  if (input.from) filters.push(gte(auditLogs.createdAt, input.from));
  if (input.to) filters.push(lte(auditLogs.createdAt, input.to));
  const where = filters.length ? and(...filters) : undefined;
  const items = await db.query.auditLogs.findMany({
    where,
    orderBy: [desc(auditLogs.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const [{ total }] = await db.select({ total: count() }).from(auditLogs).where(where);
  return {
    items: items.map((row) => ({
      ...row,
      before: row.before,
      after: row.after,
    })),
    page,
    total: Number(total ?? 0),
  };
}

export async function listSecurityEventsForAdmin(input: {
  actorUserId: string;
  page?: number;
  kind?: string;
}) {
  await requirePermission(input.actorUserId, "security.events.read");
  const db = getDb();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = 25;
  const where = input.kind ? eq(securityEvents.kind, input.kind) : undefined;
  const items = await db.query.securityEvents.findMany({
    where,
    orderBy: [desc(securityEvents.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const [{ total }] = await db.select({ total: count() }).from(securityEvents).where(where);
  return { items, page, total: Number(total ?? 0) };
}

export async function operationalSearch(input: {
  actorUserId: string;
  query: string;
}) {
  await requirePermission(input.actorUserId, "admin.dashboard.read");
  const q = input.query.trim().slice(0, 80);
  if (q.length < 2) return { members: [], credentials: [], opportunities: [] };
  const db = getDb();
  const pattern = `%${q}%`;
  const memberProfiles = await db.query.profiles.findMany({
    where: or(ilike(profiles.displayNameAr, pattern), ilike(profiles.displayNameEn, pattern)),
    limit: 10,
  });
  const creds = await db.query.credentials.findMany({
    where: ilike(credentials.publicCode, pattern),
    limit: 10,
  });
  const opportunities = await db.query.volunteerOpportunities.findMany({
    where: or(ilike(volunteerOpportunities.titleAr, pattern), ilike(volunteerOpportunities.titleEn, pattern)),
    limit: 10,
  });
  return { members: memberProfiles, credentials: creds, opportunities };
}

export async function seedSystemSettings() {
  const db = getDb();
  const defaults: Record<string, unknown> = {
    "clinic.display_name_ar": "عيادة الاستراتيجية والتنفيذ",
    "clinic.display_name_en": "Strategy & Execution Clinic",
    "default.locale": "ar",
    "directory.enabled": true,
    "applications.enabled": true,
    "volunteer.enrollment.enabled": true,
    "public.verification.enabled": true,
  };
  for (const [key, value] of Object.entries(defaults)) {
    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key),
    });
    if (!existing) {
      await db.insert(systemSettings).values({ id: uuidv7(), key, value });
    }
  }
  for (const key of FLAG_KEYS) {
    const existing = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.key, key),
    });
    if (!existing) {
      await db.insert(featureFlags).values({
        id: uuidv7(),
        key,
        enabled: key === "VOLUNTEERING" || key === "BADGES" || key === "PUBLIC_DIRECTORY",
      });
    }
  }
}

export async function listSystemSettings() {
  const db = getDb();
  const rows = await db.query.systemSettings.findMany();
  return rows.filter((r) => (PUBLIC_SETTINGS as readonly string[]).includes(r.key));
}

export async function updateSystemSetting(input: {
  actorUserId: string;
  key: string;
  value: unknown;
}) {
  await requirePermission(input.actorUserId, "settings.manage");
  if (!(PUBLIC_SETTINGS as readonly string[]).includes(input.key)) {
    throw new Error("setting_not_editable");
  }
  if (String(input.key).toLowerCase().includes("secret")) {
    throw new Error("secret_setting_forbidden");
  }
  const db = getDb();
  const existing = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, input.key),
  });
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: input.value, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({
      id: uuidv7(),
      key: input.key,
      value: input.value,
    });
  }
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "SYSTEM_SETTING_UPDATED",
    resourceType: "system_setting",
    resourceId: input.key,
    after: { value: input.value },
  });
}

export async function listFeatureFlagsForAdmin() {
  const db = getDb();
  const rows = await db.query.featureFlags.findMany({ orderBy: [asc(featureFlags.key)] });
  return rows.map((row) => ({
    ...row,
    reservedFuture: RESERVED_FUTURE_FLAGS.has(row.key as FlagKey),
  }));
}

export async function updateFeatureFlag(input: {
  actorUserId: string;
  key: string;
  enabled: boolean;
}) {
  await requirePermission(input.actorUserId, "flag.write");
  const db = getDb();
  const existing = await db.query.featureFlags.findFirst({
    where: eq(featureFlags.key, input.key),
  });
  if (!existing) throw new Error("flag_not_found");
  await db
    .update(featureFlags)
    .set({ enabled: input.enabled, updatedAt: new Date() })
    .where(eq(featureFlags.id, existing.id));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "FEATURE_FLAG_UPDATED",
    resourceType: "feature_flag",
    resourceId: input.key,
    after: { enabled: input.enabled },
  });
}

export async function listAnnouncementsForAdmin() {
  const db = getDb();
  return db.query.announcements.findMany({
    orderBy: [desc(announcements.startAt)],
    limit: 50,
  });
}

export async function createAnnouncement(input: {
  actorUserId: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  audience: string;
  severity?: string;
  startAt: Date;
  endAt?: Date | null;
  ctaPath?: string | null;
  status?: string;
}) {
  await requirePermission(input.actorUserId, "announcement.manage");
  const db = getDb();
  const id = uuidv7();
  await db.insert(announcements).values({
    id,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    bodyAr: input.bodyAr,
    bodyEn: input.bodyEn,
    audience: input.audience,
    severity: input.severity ?? "info",
    startAt: input.startAt,
    endAt: input.endAt ?? null,
    ctaPath: input.ctaPath?.startsWith("/") ? input.ctaPath : null,
    status: input.status ?? "published",
    createdBy: input.actorUserId,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "ANNOUNCEMENT_CREATED",
    resourceType: "announcement",
    resourceId: id,
  });
  return id;
}

export async function listActiveAnnouncementsForAudience(audience: string) {
  const db = getDb();
  const now = new Date();
  const rows = await db.query.announcements.findMany({
    where: eq(announcements.status, "published"),
    orderBy: [desc(announcements.startAt)],
    limit: 20,
  });
  return rows.filter((row) => {
    if (row.startAt > now) return false;
    if (row.endAt && row.endAt < now) return false;
    return row.audience === "ALL" || row.audience === audience;
  });
}
