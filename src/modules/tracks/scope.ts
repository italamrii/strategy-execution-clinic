import { and, eq, isNull, or, gt, lte } from "drizzle-orm";
import { getRolesForUser, requirePermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { getDb } from "@/shared/db/client";
import { trackLeadershipAssignments, trackMemberships } from "@/shared/db/schema";

export async function isGlobalTrackAdmin(userId: string): Promise<boolean> {
  const roles = await getRolesForUser(userId);
  return roles.some((role) =>
    ["super_admin", "platform_admin", "membership_admin"].includes(role),
  );
}

export async function getActiveLeadership(
  userId: string,
  trackId: string,
): Promise<{ leadershipRole: string } | null> {
  const db = getDb();
  const now = new Date();
  const row = await db.query.trackLeadershipAssignments.findFirst({
    where: and(
      eq(trackLeadershipAssignments.trackId, trackId),
      eq(trackLeadershipAssignments.userId, userId),
      eq(trackLeadershipAssignments.status, "active"),
      lte(trackLeadershipAssignments.startsAt, now),
      or(
        isNull(trackLeadershipAssignments.endsAt),
        gt(trackLeadershipAssignments.endsAt, now),
      ),
    ),
  });
  return row ? { leadershipRole: row.leadershipRole } : null;
}

export async function requireTrackLeaderScope(input: {
  actorUserId: string;
  trackId: string;
  permission: string;
  allowDeputy?: boolean;
}): Promise<{ leadershipRole: "primary" | "deputy" | "admin" }> {
  await requirePermission(input.actorUserId, input.permission);
  if (await isGlobalTrackAdmin(input.actorUserId)) {
    return { leadershipRole: "admin" };
  }
  const leadership = await getActiveLeadership(input.actorUserId, input.trackId);
  if (!leadership) {
    throw new AuthorizationError("track_scope_denied");
  }
  if (leadership.leadershipRole === "primary") {
    return { leadershipRole: "primary" };
  }
  if (input.allowDeputy !== false && leadership.leadershipRole === "deputy") {
    return { leadershipRole: "deputy" };
  }
  throw new AuthorizationError("track_scope_denied");
}

export async function requireActiveTrackMembership(input: {
  userId: string;
  trackId: string;
}): Promise<typeof trackMemberships.$inferSelect> {
  const db = getDb();
  const membership = await db.query.trackMemberships.findFirst({
    where: and(
      eq(trackMemberships.trackId, input.trackId),
      eq(trackMemberships.userId, input.userId),
      eq(trackMemberships.status, "active"),
    ),
  });
  if (!membership) {
    throw new AuthorizationError("track_membership_required");
  }
  return membership;
}
