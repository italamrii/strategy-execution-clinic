"use server";

import { headers } from "next/headers";
import {
  requireAuthenticatedPermission,
  requireAuthenticatedUser,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { VolunteerError } from "./errors";
import {
  activateVolunteerProfile,
  adjustVolunteerHours,
  applyToOpportunity,
  createOpportunity,
  recordAttendance,
  reviewApplication,
  reviewVolunteerHours,
  submitVolunteerHours,
  transitionOpportunity,
  updateOwnVolunteerProfile,
  withdrawApplication,
} from "./service";
import {
  activateProfileSchema,
  applicationInputSchema,
  attendanceSchema,
  hourAdjustmentSchema,
  hourReviewSchema,
  hourSubmissionSchema,
  opportunityInputSchema,
  updateProfileSchema,
} from "./schemas";

export type VolunteerActionResult =
  | { ok: true; id?: string }
  | { ok: false; code: string };

async function requestId() {
  const h = await headers();
  return h.get("x-request-id");
}

function mapError(error: unknown): VolunteerActionResult {
  if (error instanceof VolunteerError) {
    return { ok: false, code: error.code };
  }
  if (error instanceof AuthorizationError) {
    return {
      ok: false,
      code: error.message.includes("own") ? "self_approval_forbidden" : "forbidden",
    };
  }
  if (error instanceof Error && error.message.startsWith("invalid_")) {
    return { ok: false, code: error.message };
  }
  throw error;
}

export async function activateVolunteerProfileAction(
  input: unknown,
): Promise<VolunteerActionResult> {
  const parsed = activateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedUser();
    const id = await activateVolunteerProfile({
      actorUserId: auth.userId,
      ...parsed.data,
      preferredTrackIds: parsed.data.preferredTrackIds,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateVolunteerProfileAction(
  input: unknown,
): Promise<VolunteerActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedUser();
    const id = await updateOwnVolunteerProfile({
      actorUserId: auth.userId,
      ...parsed.data,
      preferredTrackIds: parsed.data.preferredTrackIds,
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function createOpportunityAction(
  input: unknown,
): Promise<VolunteerActionResult> {
  const parsed = opportunityInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("volunteer.opportunity.create");
    const id = await createOpportunity({
      actorUserId: auth.userId,
      data: parsed.data,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function publishOpportunityAction(
  opportunityId: string,
): Promise<VolunteerActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("volunteer.opportunity.manage");
    await transitionOpportunity({
      actorUserId: auth.userId,
      opportunityId,
      toStatus: "published",
      requestId: await requestId(),
    });
    return { ok: true, id: opportunityId };
  } catch (error) {
    return mapError(error);
  }
}

export async function applyToOpportunityAction(
  input: unknown,
): Promise<VolunteerActionResult> {
  const parsed = applicationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedUser();
    const id = await applyToOpportunity({
      actorUserId: auth.userId,
      ...parsed.data,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function withdrawApplicationAction(
  applicationId: string,
): Promise<VolunteerActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    await withdrawApplication({
      actorUserId: auth.userId,
      applicationId,
      requestId: await requestId(),
    });
    return { ok: true, id: applicationId };
  } catch (error) {
    return mapError(error);
  }
}

export async function reviewApplicationAction(input: {
  applicationId: string;
  decision: "accepted" | "rejected" | "waitlisted";
}): Promise<VolunteerActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("volunteer.application.review");
    await reviewApplication({
      actorUserId: auth.userId,
      applicationId: input.applicationId,
      decision: input.decision,
      requestId: await requestId(),
    });
    return { ok: true, id: input.applicationId };
  } catch (error) {
    return mapError(error);
  }
}

export async function submitHoursAction(input: unknown): Promise<VolunteerActionResult> {
  const parsed = hourSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedUser();
    const id = await submitVolunteerHours({
      actorUserId: auth.userId,
      ...parsed.data,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function reviewHoursAction(input: unknown): Promise<VolunteerActionResult> {
  const parsed = hourReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("volunteer.hours.review");
    await reviewVolunteerHours({
      actorUserId: auth.userId,
      entryId: parsed.data.entryId,
      decision: parsed.data.decision,
      reviewNotes: parsed.data.reviewNotes,
      requestId: await requestId(),
    });
    return { ok: true, id: parsed.data.entryId };
  } catch (error) {
    return mapError(error);
  }
}

export async function adjustHoursAction(input: unknown): Promise<VolunteerActionResult> {
  const parsed = hourAdjustmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("volunteer.hours.adjust");
    const id = await adjustVolunteerHours({
      actorUserId: auth.userId,
      entryId: parsed.data.entryId,
      deltaHours: parsed.data.deltaHours,
      reason: parsed.data.reason,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function recordAttendanceAction(
  input: unknown,
): Promise<VolunteerActionResult> {
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("volunteer.attendance.record");
    await recordAttendance({
      actorUserId: auth.userId,
      ...parsed.data,
      requestId: await requestId(),
    });
    return { ok: true, id: parsed.data.participationId };
  } catch (error) {
    return mapError(error);
  }
}
