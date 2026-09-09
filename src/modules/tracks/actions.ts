"use server";

import { z } from "zod";
import { requireAuthenticatedUser } from "@/modules/identity";
import {
  applyToTrack,
  appointTrackLeader,
  assignTrackMember,
  configureTrack,
  createTrackContribution,
  reviewTrackApplication,
  reviewTrackContribution,
  revokeTrackLeader,
  TrackError,
} from "@/modules/tracks";
import { AuthorizationError } from "@/shared/security/authorization";

export type TrackActionResult =
  | { ok: true; id?: string }
  | { ok: false; code: string };

function mapError(error: unknown): TrackActionResult {
  if (error instanceof TrackError || error instanceof AuthorizationError) {
    return { ok: false, code: error instanceof TrackError ? error.code : error.message };
  }
  throw error;
}

export async function applyToTrackAction(input: {
  trackId: string;
  requestedRole?: string;
  wantPrimary?: boolean;
  motivation?: string;
}): Promise<TrackActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z
      .object({
        trackId: z.string().uuid(),
        requestedRole: z.string().max(64).optional(),
        wantPrimary: z.boolean().optional(),
        motivation: z.string().max(4000).optional(),
      })
      .parse(input);
    const result = await applyToTrack({
      actorUserId: auth.userId,
      ...parsed,
      requestId: auth.requestId,
    });
    return { ok: true, id: result.id };
  } catch (error) {
    return mapError(error);
  }
}

export async function reviewTrackApplicationAction(input: {
  applicationId: string;
  decision: "approved" | "rejected";
  reason?: string;
}): Promise<TrackActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z
      .object({
        applicationId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        reason: z.string().max(2000).optional(),
      })
      .parse(input);
    await reviewTrackApplication({
      actorUserId: auth.userId,
      ...parsed,
      requestId: auth.requestId,
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function createTrackContributionAction(input: {
  trackId: string;
  contributionType: string;
  titleAr: string;
  titleEn: string;
  summaryAr?: string;
  summaryEn?: string;
  hoursClaimed?: number;
  submit?: boolean;
}): Promise<TrackActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z
      .object({
        trackId: z.string().uuid(),
        contributionType: z.string().max(64),
        titleAr: z.string().min(2).max(200),
        titleEn: z.string().min(2).max(200),
        summaryAr: z.string().max(4000).optional(),
        summaryEn: z.string().max(4000).optional(),
        hoursClaimed: z.number().min(0).max(1000).optional(),
        submit: z.boolean().optional(),
      })
      .parse(input);
    const result = await createTrackContribution({
      actorUserId: auth.userId,
      ...parsed,
      requestId: auth.requestId,
    });
    return { ok: true, id: result.id };
  } catch (error) {
    return mapError(error);
  }
}

export async function reviewTrackContributionAction(input: {
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
  hoursAwarded?: number;
}): Promise<TrackActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z
      .object({
        contributionId: z.string().uuid(),
        decision: z.enum([
          "under_review",
          "changes_requested",
          "approved",
          "published",
          "completed",
          "rejected",
          "archived",
          "cancelled",
        ]),
        reason: z.string().max(2000).optional(),
        hoursAwarded: z.number().min(0).max(1000).optional(),
      })
      .parse(input);
    await reviewTrackContribution({
      actorUserId: auth.userId,
      ...parsed,
      requestId: auth.requestId,
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function appointTrackLeaderAction(input: {
  trackId: string;
  userId: string;
  leadershipRole: "primary" | "deputy";
}): Promise<TrackActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z
      .object({
        trackId: z.string().uuid(),
        userId: z.string().uuid(),
        leadershipRole: z.enum(["primary", "deputy"]),
      })
      .parse(input);
    const result = await appointTrackLeader({
      actorUserId: auth.userId,
      ...parsed,
      requestId: auth.requestId,
    });
    return { ok: true, id: result.id };
  } catch (error) {
    return mapError(error);
  }
}

export async function assignTrackMemberAction(input: {
  trackId: string;
  userId: string;
  role?: string;
  isPrimary?: boolean;
}): Promise<TrackActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z
      .object({
        trackId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.string().max(64).optional(),
        isPrimary: z.boolean().optional(),
      })
      .parse(input);
    const result = await assignTrackMember({
      actorUserId: auth.userId,
      ...parsed,
      requestId: auth.requestId,
    });
    return { ok: true, id: result.id };
  } catch (error) {
    return mapError(error);
  }
}

export async function revokeTrackLeaderAction(input: {
  assignmentId: string;
  reason?: string;
}): Promise<TrackActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z
      .object({
        assignmentId: z.string().uuid(),
        reason: z.string().max(2000).optional(),
      })
      .parse(input);
    await revokeTrackLeader({
      actorUserId: auth.userId,
      ...parsed,
      requestId: auth.requestId,
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function configureTrackAction(input: {
  trackId: string;
  applicationsOpen?: boolean;
  allowSecondary?: boolean;
  maxSecondary?: number;
  status?: "active" | "suspended" | "archived";
  isEnabled?: boolean;
}): Promise<TrackActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z
      .object({
        trackId: z.string().uuid(),
        applicationsOpen: z.boolean().optional(),
        allowSecondary: z.boolean().optional(),
        maxSecondary: z.number().int().min(0).max(8).optional(),
        status: z.enum(["active", "suspended", "archived"]).optional(),
        isEnabled: z.boolean().optional(),
      })
      .parse(input);
    const { trackId, ...patch } = parsed;
    await configureTrack({
      actorUserId: auth.userId,
      trackId,
      patch,
      requestId: auth.requestId,
    });
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}
