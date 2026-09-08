import { and, eq, inArray } from "drizzle-orm";
import { buildActor, getRolesForUser, requirePermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { getDb } from "@/shared/db/client";
import {
  volunteerHourEntries,
  volunteerOpportunities,
  volunteerOpportunityApplications,
  volunteerParticipations,
} from "@/shared/db/schema";
import { VolunteerError } from "./errors";

/** Global volunteer admins may act on any volunteer resource. */
export async function isGlobalVolunteerAdmin(userId: string): Promise<boolean> {
  const roles = await getRolesForUser(userId);
  return roles.some((r) =>
    ["super_admin", "platform_admin", "volunteer_admin"].includes(r),
  );
}

export async function actorOrganizesOpportunity(
  actorUserId: string,
  opportunityId: string,
): Promise<boolean> {
  const db = getDb();
  const opp = await db.query.volunteerOpportunities.findFirst({
    where: eq(volunteerOpportunities.id, opportunityId),
  });
  return Boolean(opp && opp.organizerUserId === actorUserId);
}

/**
 * Permission AND resource scope for an opportunity.
 * Volunteer leaders may only access opportunities they organize.
 */
export async function requireVolunteerOpportunityScope(input: {
  actorUserId: string;
  opportunityId: string;
  permission: string;
}): Promise<void> {
  await requirePermission(input.actorUserId, input.permission);
  if (await isGlobalVolunteerAdmin(input.actorUserId)) {
    return;
  }
  const ok = await actorOrganizesOpportunity(input.actorUserId, input.opportunityId);
  if (!ok) {
    throw new AuthorizationError("volunteer_scope_denied");
  }
}

export async function requireVolunteerApplicationScope(input: {
  actorUserId: string;
  applicationId: string;
  permission: string;
}): Promise<{ application: typeof volunteerOpportunityApplications.$inferSelect }> {
  await requirePermission(input.actorUserId, input.permission);
  const db = getDb();
  const application = await db.query.volunteerOpportunityApplications.findFirst({
    where: eq(volunteerOpportunityApplications.id, input.applicationId),
  });
  if (!application) {
    throw new VolunteerError("application_not_found");
  }
  if (await isGlobalVolunteerAdmin(input.actorUserId)) {
    return { application };
  }
  const ok = await actorOrganizesOpportunity(input.actorUserId, application.opportunityId);
  if (!ok) {
    throw new AuthorizationError("volunteer_scope_denied");
  }
  return { application };
}

export async function requireVolunteerParticipationScope(input: {
  actorUserId: string;
  participationId: string;
  permission: string;
}): Promise<{ participation: typeof volunteerParticipations.$inferSelect }> {
  await requirePermission(input.actorUserId, input.permission);
  const db = getDb();
  const participation = await db.query.volunteerParticipations.findFirst({
    where: eq(volunteerParticipations.id, input.participationId),
  });
  if (!participation) {
    throw new VolunteerError("participation_not_found");
  }
  if (await isGlobalVolunteerAdmin(input.actorUserId)) {
    return { participation };
  }
  const ok = await actorOrganizesOpportunity(input.actorUserId, participation.opportunityId);
  if (!ok) {
    throw new AuthorizationError("volunteer_scope_denied");
  }
  return { participation };
}

export async function requireVolunteerHourScope(input: {
  actorUserId: string;
  entryId: string;
  permission: string;
}): Promise<{ entry: typeof volunteerHourEntries.$inferSelect }> {
  await requirePermission(input.actorUserId, input.permission);
  const db = getDb();
  const entry = await db.query.volunteerHourEntries.findFirst({
    where: eq(volunteerHourEntries.id, input.entryId),
  });
  if (!entry) {
    throw new VolunteerError("hour_entry_not_found");
  }
  if (await isGlobalVolunteerAdmin(input.actorUserId)) {
    return { entry };
  }
  if (!entry.opportunityId) {
    throw new AuthorizationError("volunteer_scope_denied");
  }
  const ok = await actorOrganizesOpportunity(input.actorUserId, entry.opportunityId);
  if (!ok) {
    throw new AuthorizationError("volunteer_scope_denied");
  }
  return { entry };
}

/**
 * Private evidence is only readable by the volunteer owner,
 * the opportunity organizer, or a global volunteer admin.
 */
export async function requireVolunteerEvidenceAccess(input: {
  actorUserId: string;
  entryId: string;
}): Promise<void> {
  const db = getDb();
  const entry = await db.query.volunteerHourEntries.findFirst({
    where: eq(volunteerHourEntries.id, input.entryId),
  });
  if (!entry) {
    throw new VolunteerError("hour_entry_not_found");
  }
  if (!entry.evidenceMediaId) {
    throw new VolunteerError("evidence_not_found");
  }
  if (entry.userId === input.actorUserId) {
    return;
  }
  if (await isGlobalVolunteerAdmin(input.actorUserId)) {
    return;
  }
  if (entry.opportunityId) {
    const ok = await actorOrganizesOpportunity(input.actorUserId, entry.opportunityId);
    if (ok) return;
  }
  throw new AuthorizationError("volunteer_evidence_denied");
}

/** Opportunity IDs the actor may manage (empty = none; null = global). */
export async function scopedOpportunityIdsForActor(
  actorUserId: string,
): Promise<string[] | null> {
  if (await isGlobalVolunteerAdmin(actorUserId)) {
    return null;
  }
  const db = getDb();
  const rows = await db.query.volunteerOpportunities.findMany({
    where: eq(volunteerOpportunities.organizerUserId, actorUserId),
  });
  return rows.map((r) => r.id);
}

export async function assertActorCanListVolunteerAdmin(actorUserId: string): Promise<void> {
  const actor = await buildActor(actorUserId);
  const hasAny = actor.permissions.some((p) =>
    [
      "volunteer.application.read.any",
      "volunteer.hours.read.any",
      "volunteer.profile.read.any",
    ].includes(p),
  );
  if (!hasAny) {
    throw new AuthorizationError("forbidden");
  }
}

export { and, eq, inArray };
