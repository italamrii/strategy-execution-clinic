"use server";

import { headers } from "next/headers";
import {
  requireAuthenticatedPermission,
  requireAuthenticatedUser,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { RecognitionError } from "./errors";
import {
  awardBadge,
  issueCertificate,
  reviewContribution,
  revokeBadge,
  revokeCertificate,
  revokeContribution,
  submitContribution,
  updateImpactWeight,
  updateMilestoneDefinition,
  updatePublicProfileSettings,
} from "./service";

export type RecognitionActionResult =
  | { ok: true; id?: string }
  | { ok: false; code: string };

async function requestId() {
  return (await headers()).get("x-request-id");
}

function mapError(error: unknown): RecognitionActionResult {
  if (error instanceof RecognitionError) return { ok: false, code: error.code };
  if (error instanceof AuthorizationError) {
    return {
      ok: false,
      code: error.message.includes("own") || error.message.includes("self")
        ? "self_approval_forbidden"
        : "forbidden",
    };
  }
  throw error;
}

export async function submitContributionAction(input: {
  contributionTypeId: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  visibility?: "private" | "public";
}): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const id = await submitContribution({
      actorUserId: auth.userId,
      ...input,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function reviewContributionAction(input: {
  contributionId: string;
  decision: "approved" | "rejected";
}): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedPermission(
      input.decision === "approved" ? "contribution.approve" : "contribution.reject",
    );
    await reviewContribution({
      actorUserId: auth.userId,
      contributionId: input.contributionId,
      decision: input.decision,
      requestId: await requestId(),
    });
    return { ok: true, id: input.contributionId };
  } catch (error) {
    return mapError(error);
  }
}

export async function awardBadgeAction(input: {
  badgeSlug: string;
  userId: string;
  reason: string;
}): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("badge.issue");
    const id = await awardBadge({
      actorUserId: auth.userId,
      badgeSlug: input.badgeSlug,
      userId: input.userId,
      reason: input.reason,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function issueCertificateAction(input: {
  definitionSlug: string;
  userId: string;
  sourceType: string;
  sourceId: string;
}): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("certificate.issue");
    const id = await issueCertificate({
      actorUserId: auth.userId,
      ...input,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function revokeCertificateAction(input: {
  certificateId: string;
  reason: string;
}): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("certificate.revoke");
    await revokeCertificate({
      actorUserId: auth.userId,
      certificateId: input.certificateId,
      reason: input.reason,
      requestId: await requestId(),
    });
    return { ok: true, id: input.certificateId };
  } catch (error) {
    return mapError(error);
  }
}

export async function revokeBadgeAction(input: {
  awardId: string;
  reason: string;
}): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("badge.revoke");
    await revokeBadge({
      actorUserId: auth.userId,
      awardId: input.awardId,
      reason: input.reason,
      requestId: await requestId(),
    });
    return { ok: true, id: input.awardId };
  } catch (error) {
    return mapError(error);
  }
}

export async function revokeContributionAction(input: {
  contributionId: string;
  reason: string;
}): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("contribution.revoke");
    await revokeContribution({
      actorUserId: auth.userId,
      contributionId: input.contributionId,
      reason: input.reason,
      requestId: await requestId(),
    });
    return { ok: true, id: input.contributionId };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateVisibilityAction(
  patch: Parameters<typeof updatePublicProfileSettings>[0]["patch"],
): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    await updatePublicProfileSettings({
      actorUserId: auth.userId,
      patch,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateImpactWeightAction(input: {
  eventKind: string;
  weight: number;
}): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("impact.config.manage");
    await updateImpactWeight({
      actorUserId: auth.userId,
      eventKind: input.eventKind,
      weight: input.weight,
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateMilestoneConfigAction(input: {
  milestoneId: string;
  isEnabled?: boolean;
  threshold?: number;
  nameAr?: string;
  nameEn?: string;
  sortOrder?: number;
}): Promise<RecognitionActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("milestone.config.manage");
    await updateMilestoneDefinition({
      actorUserId: auth.userId,
      milestoneId: input.milestoneId,
      patch: {
        isEnabled: input.isEnabled,
        threshold: input.threshold,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        sortOrder: input.sortOrder,
      },
      requestId: await requestId(),
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}
