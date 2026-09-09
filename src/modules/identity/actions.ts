"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
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
import { isClerkAuthProvider } from "@/shared/config/auth-provider";
import {
  ClerkMappingError,
  syncClerkIdentityToLocalUser,
} from "./auth/clerk-sync";

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

/** @deprecated Legacy OTP — retained for AUTH_PROVIDER=legacy and tests only. */
export async function requestOtpAction(input: {
  email: string;
  locale: "ar" | "en";
}): Promise<ActionResult> {
  if (isClerkAuthProvider()) {
    return { ok: false, code: "invalid_input" };
  }
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

/** @deprecated Legacy OTP — retained for AUTH_PROVIDER=legacy and tests only. */
export async function verifyOtpAction(input: {
  email: string;
  code: string;
}): Promise<ActionResult> {
  if (isClerkAuthProvider()) {
    return { ok: false, code: "invalid_input" };
  }
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

/**
 * After Clerk client finalize(), sync the Clerk identity to the local user
 * and write AUTH_LOGIN_SUCCESS. Does not log tokens or secrets.
 */
export async function completeClerkLoginAction(input: {
  locale: "ar" | "en";
}): Promise<ActionResult> {
  if (!isClerkAuthProvider()) {
    return { ok: false, code: "invalid_input" };
  }
  const meta = await requestMeta();
  try {
    let userId: string | null = null;
    let sessionId: string | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const session = await auth();
      userId = session.userId;
      sessionId = session.sessionId;
      if (userId && sessionId) break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    if (!userId || !sessionId) {
      return { ok: false, code: "invalid_otp" };
    }
    const clerkUser = await currentUser();
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      await writeAudit({
        action: "AUTH_MAPPING_FAILED",
        resourceType: "clerk_user",
        resourceId: userId,
        requestId: meta.requestId,
        reason: "missing_email",
      });
      return { ok: false, code: "invalid_otp" };
    }

    await syncClerkIdentityToLocalUser(
      {
        clerkUserId: userId,
        email,
        locale: input.locale,
      },
      { requestId: meta.requestId, auditLogin: true, touchLogin: true },
    );
    return { ok: true };
  } catch (error) {
    if (error instanceof ClerkMappingError) {
      return {
        ok: false,
        code: error.code === "account_restricted" ? "account_restricted" : "invalid_otp",
      };
    }
    await writeAudit({
      action: "AUTH_MAPPING_FAILED",
      resourceType: "clerk_user",
      resourceId: "unknown",
      requestId: meta.requestId,
      reason: "unexpected_complete_login_error",
    });
    return { ok: false, code: "invalid_otp" };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  const ctx = await getOptionalAuthContext();
  const meta = await requestMeta();

  if (isClerkAuthProvider()) {
    const session = await auth();
    if (ctx) {
      await writeAudit({
        actorUserId: ctx.userId,
        action: "AUTH_LOGOUT",
        resourceType: "clerk_session",
        resourceId: session.sessionId ?? ctx.sessionId,
        requestId: ctx.requestId ?? meta.requestId,
      });
    }
    if (session.sessionId) {
      try {
        const client = await clerkClient();
        await client.sessions.revokeSession(session.sessionId);
      } catch {
        // Client-side signOut remains the fallback.
      }
    }
    return { ok: true };
  }

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
  const meta = await requestMeta();

  if (isClerkAuthProvider()) {
    const session = await auth();
    if (session.userId) {
      try {
        const client = await clerkClient();
        const list = await client.sessions.getSessionList({
          userId: session.userId,
          status: "active",
        });
        for (const item of list.data) {
          await client.sessions.revokeSession(item.id);
        }
      } catch {
        // Best effort; client signOut still clears local browser session.
      }
    }
    await writeAudit({
      actorUserId: ctx.userId,
      action: "AUTH_LOGOUT_ALL",
      resourceType: "clerk_user",
      resourceId: session.userId ?? ctx.userId,
      requestId: ctx.requestId ?? meta.requestId,
    });
    return { ok: true };
  }

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
  if (isClerkAuthProvider()) {
    const session = await auth();
    return [
      {
        id: session.sessionId ?? ctx.sessionId,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        current: true,
      },
    ];
  }
  const rows = await listSessionsForUser(ctx.userId);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: row.lastActiveAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    current: row.id === ctx.sessionId,
  }));
}
