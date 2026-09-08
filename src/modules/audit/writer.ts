import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/shared/db/client";
import { auditLogs, securityEvents } from "@/shared/db/schema";

export const AUDIT_ACTIONS = [
  "AUTH_LOGIN_SUCCESS",
  "AUTH_LOGIN_FAILED",
  "AUTH_LOGOUT",
  "AUTH_LOGOUT_ALL",
  "SESSION_REVOKED",
  "PROFILE_UPDATED",
  "LOCALE_CHANGED",
  "ROLE_ASSIGNED",
  "ROLE_REVOKED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_REACTIVATED",
  "ACCOUNT_DISABLED",
  "OTP_REQUESTED",
  "MEMBERSHIP_APPLICATION_CREATED",
  "MEMBERSHIP_APPLICATION_SUBMITTED",
  "MEMBERSHIP_APPLICATION_UPDATED",
  "MEMBERSHIP_APPLICATION_WITHDRAWN",
  "MEMBERSHIP_REVIEW_STARTED",
  "MEMBERSHIP_CHANGES_REQUESTED",
  "MEMBERSHIP_APPLICATION_APPROVED",
  "MEMBERSHIP_APPLICATION_REJECTED",
  "MEMBERSHIP_ISSUED",
  "MEMBERSHIP_ISSUED_DIRECTLY",
  "MEMBERSHIP_SUSPENDED",
  "MEMBERSHIP_REACTIVATED",
  "MEMBERSHIP_EXPIRED",
  "MEMBERSHIP_REVOKED",
  "MEMBERSHIP_TYPE_CREATED",
  "MEMBERSHIP_TYPE_UPDATED",
  "MEMBERSHIP_TYPE_DISABLED",
  "TRACK_CREATED",
  "TRACK_UPDATED",
  "TRACK_DISABLED",
  "CREDENTIAL_ISSUED",
  "CREDENTIAL_BACKFILLED",
  "CREDENTIAL_SUSPENDED",
  "CREDENTIAL_REACTIVATED",
  "CREDENTIAL_REVOKED",
  "CREDENTIAL_EXPIRED",
  "CREDENTIAL_PNG_GENERATED",
  "CREDENTIAL_PDF_GENERATED",
  "CREDENTIAL_SHARE_ASSET_GENERATED",
  "CARD_VISUAL_REGENERATED",
  "VOLUNTEER_PROFILE_ACTIVATED",
  "VOLUNTEER_PROFILE_PAUSED",
  "VOLUNTEER_OPPORTUNITY_CREATED",
  "VOLUNTEER_OPPORTUNITY_PUBLISHED",
  "VOLUNTEER_OPPORTUNITY_UPDATED",
  "VOLUNTEER_OPPORTUNITY_CANCELLED",
  "VOLUNTEER_APPLICATION_SUBMITTED",
  "VOLUNTEER_APPLICATION_ACCEPTED",
  "VOLUNTEER_APPLICATION_REJECTED",
  "VOLUNTEER_APPLICATION_WITHDRAWN",
  "VOLUNTEER_PARTICIPATION_STARTED",
  "VOLUNTEER_PARTICIPATION_COMPLETED",
  "VOLUNTEER_PARTICIPATION_REMOVED",
  "VOLUNTEER_ATTENDANCE_RECORDED",
  "VOLUNTEER_HOURS_SUBMITTED",
  "VOLUNTEER_HOURS_APPROVED",
  "VOLUNTEER_HOURS_REJECTED",
  "VOLUNTEER_HOURS_ADJUSTED",
  "VOLUNTEER_LEVEL_CHANGED",
  "CONTRIBUTION_SUBMITTED",
  "CONTRIBUTION_REVIEW_STARTED",
  "CONTRIBUTION_APPROVED",
  "CONTRIBUTION_REJECTED",
  "CONTRIBUTION_REVOKED",
  "BADGE_DEFINITION_CREATED",
  "BADGE_DEFINITION_UPDATED",
  "BADGE_AWARDED",
  "BADGE_REVOKED",
  "CERTIFICATE_DEFINITION_CREATED",
  "CERTIFICATE_ISSUED",
  "CERTIFICATE_REVOKED",
  "IMPACT_CONFIG_UPDATED",
  "MILESTONE_CONFIG_UPDATED",
  "PUBLIC_PROFILE_VISIBILITY_UPDATED",
  "NOTIFICATION_RETRY_REQUESTED",
  "CONTENT_PUBLISHED",
  "CONTENT_UPDATED",
  "ANNOUNCEMENT_CREATED",
  "ANNOUNCEMENT_UPDATED",
  "SYSTEM_SETTING_UPDATED",
  "FEATURE_FLAG_UPDATED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const FORBIDDEN_META_KEYS = [
  "otp",
  "code",
  "token",
  "cookie",
  "authorization",
  "password",
  "secret",
  "sessionToken",
  "magicLink",
];

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_META_KEYS.some((forbidden) => key.toLowerCase().includes(forbidden))) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = scrub(nested);
    }
    return out;
  }
  return value;
}

export async function writeAudit(input: {
  actorUserId?: string | null;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string | null;
  requestId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  ipHash?: string | null;
}): Promise<void> {
  const db = getDb();
  await db.insert(auditLogs).values({
    id: uuidv7(),
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    requestId: input.requestId ?? null,
    reason: input.reason ?? null,
    before: input.before ? (scrub(input.before) as object) : null,
    after: input.after ? (scrub(input.after) as object) : null,
    ipHash: input.ipHash ?? null,
  });
}

export async function writeSecurityEvent(input: {
  kind: string;
  userId?: string | null;
  requestId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();
  await db.insert(securityEvents).values({
    id: uuidv7(),
    kind: input.kind,
    userId: input.userId ?? null,
    requestId: input.requestId ?? null,
    meta: input.meta ? (scrub(input.meta) as object) : null,
  });
}
