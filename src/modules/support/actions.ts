"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { getOptionalAuthContext, requireAuthenticatedPermission, RateLimitError } from "@/modules/identity";
import { SupportError } from "./errors";
import { SUPPORT_CATEGORIES } from "./catalog";
import { createSupportRequest, updateSupportRequestStatus } from "./service";

export type SupportActionResult = { ok: true; id?: string } | { ok: false; code: string };

function fail(error: unknown): SupportActionResult {
  if (error instanceof RateLimitError) return { ok: false, code: "rate_limited" };
  if (error instanceof SupportError) return { ok: false, code: error.code };
  if (error instanceof z.ZodError) return { ok: false, code: "invalid_input" };
  throw error;
}

export async function createSupportRequestAction(input: {
  category: string;
  subject: string;
  message: string;
  replyEmail: string;
  locale: "ar" | "en";
  website?: string;
}): Promise<SupportActionResult> {
  try {
    const parsed = z.object({
      category: z.enum(SUPPORT_CATEGORIES),
      subject: z.string().min(4).max(180),
      message: z.string().min(20).max(8000),
      replyEmail: z.string().email().max(254),
      locale: z.enum(["ar", "en"]),
      website: z.string().max(200).optional(),
    }).parse(input);
    const auth = await getOptionalAuthContext();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    const result = await createSupportRequest({
      actorUserId: auth?.userId ?? null,
      category: parsed.category,
      subject: parsed.subject,
      message: parsed.message,
      replyEmail: parsed.replyEmail,
      locale: parsed.locale,
      honeypot: parsed.website ?? "",
      ip,
      requestId: auth?.requestId ?? h.get("x-request-id"),
    });
    return { ok: true, id: result.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateSupportRequestAction(input: {
  requestId: string;
  status: "open" | "in_progress" | "resolved";
  adminNotes?: string;
}): Promise<SupportActionResult> {
  try {
    const auth = await requireAuthenticatedPermission("support.request.read.any");
    const parsed = z.object({
      requestId: z.string().uuid(),
      status: z.enum(["open", "in_progress", "resolved"]),
      adminNotes: z.string().max(2000).optional(),
    }).parse(input);
    await updateSupportRequestStatus({
      actorUserId: auth.userId,
      requestId: parsed.requestId,
      status: parsed.status,
      adminNotes: parsed.adminNotes,
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
