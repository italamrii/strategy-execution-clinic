"use server";

import { headers } from "next/headers";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
  requireAuthenticatedUser,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { MembershipError } from "./errors";
import { CredentialError } from "@/modules/credentials/errors";
import {
  applicationDraftSchema,
  applicationUpdateSchema,
  assignReviewerSchema,
  directIssueSchema,
  lifecycleChangeSchema,
  membershipTypePatchSchema,
  rejectOrChangesSchema,
  reviewDecisionSchema,
  trackPatchSchema,
} from "./schemas";
import {
  approveApplication,
  assignReviewer,
  createApplication,
  issueMembershipDirectly,
  reactivateMembership,
  rejectApplication,
  requestChanges,
  revokeMembership,
  startReview,
  submitOwnApplication,
  suspendMembership,
  updateOwnApplication,
  withdrawOwnApplication,
} from "./service";
import { updateMembershipType, updateTrack } from "./catalog-service";

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; code: string };

async function requestId() {
  const h = await headers();
  return h.get("x-request-id");
}

function mapError(error: unknown): ActionResult {
  if (error instanceof MembershipError) {
    return { ok: false, code: error.code };
  }
  if (error instanceof CredentialError) {
    return { ok: false, code: error.code };
  }
  if (error instanceof AuthorizationError) {
    return { ok: false, code: error.message.includes("own") ? "self_approval_forbidden" : "forbidden" };
  }
  if (error instanceof Error && error.message.startsWith("invalid_application_transition")) {
    return { ok: false, code: error.message };
  }
  throw error;
}

export async function createApplicationAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = applicationDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedUser();
    const id = await createApplication({
      actorUserId: auth.userId,
      data: parsed.data,
      submit: true,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateApplicationAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = applicationUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedUser();
    const { applicationId, ...data } = parsed.data;
    await updateOwnApplication({
      actorUserId: auth.userId,
      applicationId,
      data,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function submitApplicationAction(
  applicationId: string,
): Promise<ActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    await submitOwnApplication({
      actorUserId: auth.userId,
      applicationId,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function withdrawApplicationAction(
  applicationId: string,
): Promise<ActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    await withdrawOwnApplication({
      actorUserId: auth.userId,
      applicationId,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function startReviewAction(applicationId: string): Promise<ActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("membership.application.review");
    await startReview({
      actorUserId: auth.userId,
      applicationId,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function requestChangesAction(input: unknown): Promise<ActionResult> {
  const parsed = rejectOrChangesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.application.review");
    await requestChanges({
      actorUserId: auth.userId,
      applicationId: parsed.data.applicationId,
      reason: parsed.data.reason,
      internalNotes: parsed.data.internalNotes,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function rejectApplicationAction(input: unknown): Promise<ActionResult> {
  const parsed = rejectOrChangesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.application.reject");
    await rejectApplication({
      actorUserId: auth.userId,
      applicationId: parsed.data.applicationId,
      reason: parsed.data.reason,
      internalNotes: parsed.data.internalNotes,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function approveApplicationAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.application.approve");
    const id = await approveApplication({
      actorUserId: auth.userId,
      applicationId: parsed.data.applicationId,
      reason: parsed.data.reason,
      internalNotes: parsed.data.internalNotes,
      trackIds: parsed.data.trackIds,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function assignReviewerAction(input: unknown): Promise<ActionResult> {
  const parsed = assignReviewerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.application.assign");
    await assignReviewer({
      actorUserId: auth.userId,
      applicationId: parsed.data.applicationId,
      reviewerId: parsed.data.reviewerId,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function issueDirectAction(input: unknown): Promise<ActionResult> {
  const parsed = directIssueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.issue");
    const id = await issueMembershipDirectly({
      actorUserId: auth.userId,
      targetUserId: parsed.data.targetUserId,
      membershipTypeId: parsed.data.membershipTypeId,
      trackIds: parsed.data.trackIds,
      reason: parsed.data.reason,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function suspendMembershipAction(input: unknown): Promise<ActionResult> {
  const parsed = lifecycleChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.suspend");
    await suspendMembership({
      actorUserId: auth.userId,
      membershipId: parsed.data.membershipId,
      reason: parsed.data.reason,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function revokeMembershipAction(input: unknown): Promise<ActionResult> {
  const parsed = lifecycleChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.revoke");
    await revokeMembership({
      actorUserId: auth.userId,
      membershipId: parsed.data.membershipId,
      reason: parsed.data.reason,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function reactivateMembershipAction(input: unknown): Promise<ActionResult> {
  const parsed = lifecycleChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.issue");
    await reactivateMembership({
      actorUserId: auth.userId,
      membershipId: parsed.data.membershipId,
      reason: parsed.data.reason,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateMembershipTypeAction(input: unknown): Promise<ActionResult> {
  const parsed = membershipTypePatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.type.manage");
    const { typeId, ...patch } = parsed.data;
    await updateMembershipType({
      actorUserId: auth.userId,
      typeId,
      patch,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateTrackAction(input: unknown): Promise<ActionResult> {
  const parsed = trackPatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  try {
    const auth = await requireAuthenticatedPermission("membership.track.manage");
    const { trackId, ...patch } = parsed.data;
    await updateTrack({
      actorUserId: auth.userId,
      trackId,
      patch,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function getOptionalMembershipAuth() {
  return getOptionalAuthContext();
}
