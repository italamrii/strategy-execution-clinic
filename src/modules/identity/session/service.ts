import { and, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { getDb } from "@/shared/db/client";
import { sessions, users } from "@/shared/db/schema";
import {
  SESSION_IDLE_MS,
  SESSION_TTL_MS,
} from "../constants";
import { generateSessionToken, hashForTelemetry, hashToken } from "../crypto";

export type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
  ipHash: string | null;
  userAgentHash: string | null;
};

export async function createSession(input: {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
  rotatedFrom?: string | null;
  requestId?: string | null;
}): Promise<{ session: SessionRecord; token: string }> {
  const db = getDb();
  const token = generateSessionToken();
  const now = new Date();
  const id = uuidv7();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id,
    userId: input.userId,
    tokenHash: hashToken(token),
    expiresAt,
    lastActiveAt: now,
    rotatedFrom: input.rotatedFrom ?? null,
    ipHash: input.ip ? hashForTelemetry(input.ip) : null,
    userAgentHash: input.userAgent ? hashForTelemetry(input.userAgent) : null,
    createdAt: now,
  });

  return {
    token,
    session: {
      id,
      userId: input.userId,
      expiresAt,
      lastActiveAt: now,
      createdAt: now,
      ipHash: input.ip ? hashForTelemetry(input.ip) : null,
      userAgentHash: input.userAgent ? hashForTelemetry(input.userAgent) : null,
    },
  };
}

export async function resolveSessionByToken(token: string): Promise<SessionRecord | null> {
  const db = getDb();
  const tokenHash = hashToken(token);
  const row = await db.query.sessions.findFirst({
    where: and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)),
  });
  if (!row) {
    return null;
  }
  const now = new Date();
  if (row.expiresAt.getTime() <= now.getTime()) {
    return null;
  }
  if (now.getTime() - row.lastActiveAt.getTime() > SESSION_IDLE_MS) {
    return null;
  }

  await db
    .update(sessions)
    .set({ lastActiveAt: now })
    .where(eq(sessions.id, row.id));

  return {
    id: row.id,
    userId: row.userId,
    expiresAt: row.expiresAt,
    lastActiveAt: now,
    createdAt: row.createdAt,
    ipHash: row.ipHash,
    userAgentHash: row.userAgentHash,
  };
}

export async function revokeSession(input: {
  sessionId: string;
  actorUserId: string;
  requestId?: string | null;
  reason?: string;
}): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(eq(sessions.id, input.sessionId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "SESSION_REVOKED",
    resourceType: "session",
    resourceId: input.sessionId,
    requestId: input.requestId,
    reason: input.reason ?? "revoked",
  });
}

export async function revokeAllSessionsForUser(input: {
  userId: string;
  actorUserId: string;
  exceptSessionId?: string | null;
  requestId?: string | null;
}): Promise<number> {
  const db = getDb();
  const active = await db.query.sessions.findMany({
    where: and(eq(sessions.userId, input.userId), isNull(sessions.revokedAt)),
  });
  const now = new Date();
  let count = 0;
  for (const session of active) {
    if (input.exceptSessionId && session.id === input.exceptSessionId) {
      continue;
    }
    await db
      .update(sessions)
      .set({ revokedAt: now })
      .where(eq(sessions.id, session.id));
    count += 1;
  }
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "AUTH_LOGOUT_ALL",
    resourceType: "user",
    resourceId: input.userId,
    requestId: input.requestId,
    after: { revokedCount: count },
  });
  return count;
}

export async function listSessionsForUser(userId: string) {
  const db = getDb();
  return db.query.sessions.findMany({
    where: and(eq(sessions.userId, userId), isNull(sessions.revokedAt)),
    orderBy: [desc(sessions.createdAt)],
  });
}

export async function touchUserLogin(userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}
