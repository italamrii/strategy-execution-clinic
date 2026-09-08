import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/shared/db/client";
import { users } from "@/shared/db/schema";
import { AuthorizationError } from "@/shared/security/authorization";
import { buildActor, getRolesForUser, requirePermission } from "../rbac/service";
import { readSessionToken } from "../session/cookie";
import { resolveSessionByToken } from "../session/service";

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

export async function getOptionalAuthContext(): Promise<AuthContext | null> {
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
    return null;
  }
  const [permissions, roles, requestId] = await Promise.all([
    buildActor(user.id).then((actor) => actor.permissions),
    getRolesForUser(user.id),
    getRequestId(),
  ]);
  return {
    userId: user.id,
    sessionId: session.id,
    email: user.email,
    locale: user.locale,
    status: user.status,
    permissions,
    roles,
    requestId,
  };
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
