"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  AuthError,
  RateLimitError,
  clearSessionCookie,
  getOptionalAuthContext,
  listSessionsForUser,
  requestLoginOtp,
  requireAuthenticatedUser,
  revokeAllSessionsForUser,
  revokeSession,
  setSessionCookie,
  updateLocale,
  updateOwnProfile,
  verifyLoginOtp,
  writeAudit,
} from "./actions-deps";
import type { Locale } from "@/i18n/routing";

const emailSchema = z.object({
  email: z.string().email().max(320),
  locale: z.enum(["ar", "en"]),
});

const verifySchema = z.object({
  email: z.string().email().max(320),
  code: z.string().regex(/^\d{6}$/),
});

async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
    requestId: h.get("x-request-id"),
  };
}

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; code: string };

export async function requestOtpAction(input: {
  email: string;
  locale: "ar" | "en";
}): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input" };
  }
  const meta = await requestMeta();
  try {
    await requestLoginOtp({
      email: parsed.data.email,
      locale: parsed.data.locale,
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, code: "rate_limited" };
    }
    if (error instanceof AuthError) {
      return { ok: false, code: error.code };
    }
    throw error;
  }
}

export async function verifyOtpAction(input: {
  email: string;
  code: string;
}): Promise<ActionResult> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input" };
  }
  const meta = await requestMeta();
  try {
    const result = await verifyLoginOtp({
      email: parsed.data.email,
      code: parsed.data.code,
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
    await setSessionCookie(result.token);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, code: error.code };
    }
    throw error;
  }
}

export async function logoutAction(): Promise<ActionResult> {
  const ctx = await getOptionalAuthContext();
  if (ctx) {
    await revokeSession({
      sessionId: ctx.sessionId,
      actorUserId: ctx.userId,
      requestId: ctx.requestId,
      reason: "logout",
    });
    await writeAudit({
      actorUserId: ctx.userId,
      action: "AUTH_LOGOUT",
      resourceType: "session",
      resourceId: ctx.sessionId,
      requestId: ctx.requestId,
    });
  }
  await clearSessionCookie();
  return { ok: true };
}

export async function logoutAllAction(): Promise<ActionResult> {
  const ctx = await requireAuthenticatedUser();
  await revokeAllSessionsForUser({
    userId: ctx.userId,
    actorUserId: ctx.userId,
    requestId: ctx.requestId,
  });
  await clearSessionCookie();
  return { ok: true };
}

export async function updateProfileAction(input: Record<string, unknown>): Promise<ActionResult> {
  const ctx = await requireAuthenticatedUser();
  await updateOwnProfile({
    userId: ctx.userId,
    requestId: ctx.requestId,
    patch: input,
  });
  return { ok: true };
}

export async function updateLocaleAction(locale: Locale): Promise<ActionResult> {
  const ctx = await getOptionalAuthContext();
  if (!ctx) {
    return { ok: true };
  }
  await updateLocale({
    userId: ctx.userId,
    locale,
    requestId: ctx.requestId,
  });
  return { ok: true };
}

export async function getSessionsAction() {
  const ctx = await requireAuthenticatedUser();
  const rows = await listSessionsForUser(ctx.userId);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: row.lastActiveAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    current: row.id === ctx.sessionId,
  }));
}
