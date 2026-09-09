import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import {
  ClerkMappingError,
  syncClerkIdentityToLocalUser,
} from "../auth/clerk-sync";
import { buildActor, getRolesForUser, requirePermission } from "../rbac/service";
import { readSessionToken } from "../session/cookie";
import { resolveSessionByToken } from "../session/service";
import { AuthorizationError } from "@/shared/security/authorization";
import { getDb } from "@/shared/db/client";
import { users } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { isClerkAuthProvider } from "@/shared/config/auth-provider";
import { writeAudit, writeSecurityEvent } from "@/modules/audit";

export type AuthContext = {
  userId: string;
  sessionId: string;
  email: string;
  locale: string;
  status: string;
  permissions: readonly string[];
  roles: readonly string[];
  requestId: string | null;
};

export async function getRequestId(): Promise<string | null> {
  const h = await headers();
  return h.get("x-request-id");
}

async function buildContextFromLocalUser(input: {
  userId: string;
  email: string;
  locale: string;
  status: string;
  sessionId: string;
}): Promise<AuthContext> {
  const [permissions, roles, requestId] = await Promise.all([
    buildActor(input.userId).then((actor) => actor.permissions),
    getRolesForUser(input.userId),
    getRequestId(),
  ]);
  return {
    userId: input.userId,
    sessionId: input.sessionId,
    email: input.email,
    locale: input.locale,
    status: input.status,
    permissions,
    roles,
    requestId,
  };
}

async function revokeClerkSessionSafe(sessionId: string | null | undefined): Promise<void> {
  if (!sessionId) return;
  try {
    const client = await clerkClient();
    await client.sessions.revokeSession(sessionId);
  } catch {
    // Best-effort revoke; caller still denies access.
  }
}

async function getClerkAuthContext(): Promise<AuthContext | null> {
  const session = await auth();
  const clerkUserId = session.userId;
  const clerkSessionId = session.sessionId;
  if (!clerkUserId || !clerkSessionId) {
    return null;
  }

  const clerkUser = await currentUser();
  const primaryEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress;
  if (!primaryEmail) {
    await writeAudit({
      action: "AUTH_MAPPING_FAILED",
      resourceType: "clerk_user",
      resourceId: clerkUserId,
      requestId: await getRequestId(),
      reason: "missing_email",
    });
    await revokeClerkSessionSafe(clerkSessionId);
    return null;
  }

  const locale =
    clerkUser?.publicMetadata &&
    typeof clerkUser.publicMetadata === "object" &&
    (clerkUser.publicMetadata as { locale?: string }).locale === "en"
      ? "en"
      : "ar";

  try {
    const local = await syncClerkIdentityToLocalUser(
      {
        clerkUserId,
        email: primaryEmail,
        locale,
      },
      { requestId: await getRequestId() },
    );
    return buildContextFromLocalUser({
      userId: local.id,
      email: local.email,
      locale: local.locale,
      status: local.status,
      sessionId: clerkSessionId,
    });
  } catch (error) {
    if (error instanceof ClerkMappingError && error.code === "account_restricted") {
      await revokeClerkSessionSafe(clerkSessionId);
      return null;
    }
    if (error instanceof ClerkMappingError) {
      await revokeClerkSessionSafe(clerkSessionId);
      return null;
    }
    throw error;
  }
}

async function getLegacySessionAuthContext(): Promise<AuthContext | null> {
  const token = await readSessionToken();
  if (!token) {
    return null;
  }
  const session = await resolveSessionByToken(token);
  if (!session) {
    return null;
  }
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  if (!user || user.status !== "active") {
    if (user && user.status !== "active") {
      await writeSecurityEvent({
        kind: "blocked_account_legacy_session",
        userId: user.id,
        requestId: await getRequestId(),
        meta: { status: user.status },
      });
    }
    return null;
  }
  return buildContextFromLocalUser({
    userId: user.id,
    email: user.email,
    locale: user.locale,
    status: user.status,
    sessionId: session.id,
  });
}

export async function getOptionalAuthContext(): Promise<AuthContext | null> {
  if (isClerkAuthProvider()) {
    return getClerkAuthContext();
  }
  return getLegacySessionAuthContext();
}

export async function requireAuthenticatedUser(): Promise<AuthContext> {
  const ctx = await getOptionalAuthContext();
  if (!ctx) {
    throw new AuthorizationError("unauthenticated");
  }
  return ctx;
}

export async function requireAuthenticatedPermission(
  permission: string,
): Promise<AuthContext> {
  const ctx = await requireAuthenticatedUser();
  await requirePermission(ctx.userId, permission);
  return ctx;
}
