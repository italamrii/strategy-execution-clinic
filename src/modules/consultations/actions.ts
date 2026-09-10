"use server";

import { z } from "zod";
import { requireAuthenticatedUser } from "@/modules/identity";
import { ConsultationError } from "./errors";
import { addConsultationMessage, assignConsultation, createConsultation, updateConsultationStatus } from "./service";

export type ConsultationActionResult = { ok: true; id?: string } | { ok: false; code: string };

function fail(error: unknown): ConsultationActionResult {
  if (error instanceof ConsultationError) return { ok: false, code: error.code };
  if (error instanceof z.ZodError) return { ok: false, code: "invalid_input" };
  throw error;
}

export async function createConsultationAction(input: {
  trackId?: string;
  subject: string;
  description: string;
  desiredOutcome?: string;
  urgency?: "normal" | "urgent";
}): Promise<ConsultationActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z.object({
      trackId: z.string().uuid().optional(),
      subject: z.string().min(4).max(180),
      description: z.string().min(20).max(12000),
      desiredOutcome: z.string().max(6000).optional(),
      urgency: z.enum(["normal", "urgent"]).optional(),
    }).parse(input);
    const result = await createConsultation({ actorUserId: auth.userId, ...parsed, requestId: auth.requestId });
    return { ok: true, id: result.id };
  } catch (error) { return fail(error); }
}

export async function addConsultationMessageAction(input: {
  consultationId: string;
  body: string;
  kind?: "message" | "deliverable" | "feedback";
}): Promise<ConsultationActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z.object({
      consultationId: z.string().uuid(),
      body: z.string().min(1).max(12000),
      kind: z.enum(["message", "deliverable", "feedback"]).optional(),
    }).parse(input);
    const result = await addConsultationMessage({ actorUserId: auth.userId, ...parsed, requestId: auth.requestId });
    return { ok: true, id: result.id };
  } catch (error) { return fail(error); }
}

export async function updateConsultationStatusAction(input: { consultationId: string; status: "in_progress" | "completed" | "closed" | "cancelled" }): Promise<ConsultationActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z.object({ consultationId: z.string().uuid(), status: z.enum(["in_progress", "completed", "closed", "cancelled"]) }).parse(input);
    await updateConsultationStatus({ actorUserId: auth.userId, ...parsed, requestId: auth.requestId });
    return { ok: true };
  } catch (error) { return fail(error); }
}

export async function assignConsultationAction(input: { consultationId: string; expertUserId: string }): Promise<ConsultationActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z.object({ consultationId: z.string().uuid(), expertUserId: z.string().uuid() }).parse(input);
    await assignConsultation({ actorUserId: auth.userId, ...parsed, requestId: auth.requestId });
    return { ok: true };
  } catch (error) { return fail(error); }
}
