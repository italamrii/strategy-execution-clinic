import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit, writeSecurityEvent } from "@/modules/audit";
import { getDb } from "@/shared/db/client";
import {
  authOtpChallenges,
  profileContacts,
  profiles,
  roles,
  userRoles,
  users,
} from "@/shared/db/schema";
import { getEmailProvider } from "@/shared/ports/email";
import {
  OTP_EMAIL_LIMIT_PER_HOUR,
  OTP_IP_LIMIT_PER_HOUR,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from "../constants";
import {
  generateOtpCode,
  hashForTelemetry,
  hashSecret,
  normalizeEmail,
  safeEqualHex,
} from "../crypto";
import { consumeRateLimit, RateLimitError } from "../rate-limit";
import { createSession, touchUserLogin } from "../session/service";

export class AuthError extends Error {
  readonly code: string;
  constructor(code: string, message = code) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

const GENERIC_OTP_ACCEPTED = {
  ok: true as const,
  message: "If the email can receive codes, a one-time code was sent.",
};

async function ensureMemberRole(userId: string): Promise<void> {
  const db = getDb();
  const memberRole = await db.query.roles.findFirst({
    where: eq(roles.slug, "member"),
  });
  if (!memberRole) {
    return;
  }
  const existing = await db.query.userRoles.findFirst({
    where: and(eq(userRoles.userId, userId), eq(userRoles.roleId, memberRole.id)),
  });
  if (existing) {
    return;
  }
  await db.insert(userRoles).values({
    id: uuidv7(),
    userId,
    roleId: memberRole.id,
    organizationId: null,
    grantedBy: null,
  });
}

async function ensureUserSkeleton(email: string, locale: "ar" | "en") {
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return existing;
  }

  const id = uuidv7();
  const now = new Date();
  await db.insert(users).values({
    id,
    email,
    locale,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(profiles).values({
    id: uuidv7(),
    userId: id,
    displayNameAr: email.split("@")[0] ?? "عضو",
    displayNameEn: email.split("@")[0] ?? "Member",
    visibility: "private",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(profileContacts).values({
    id: uuidv7(),
    userId: id,
    createdAt: now,
    updatedAt: now,
  });
  await ensureMemberRole(id);
  return (await db.query.users.findFirst({ where: eq(users.id, id) }))!;
}

export async function requestLoginOtp(input: {
  email: string;
  locale: "ar" | "en";
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}): Promise<typeof GENERIC_OTP_ACCEPTED> {
  const email = normalizeEmail(input.email);
  const db = getDb();
  const ipKey = input.ip ? hashForTelemetry(input.ip) : "unknown";

  try {
    await consumeRateLimit({
      key: `otp:email:${email}`,
      limit: OTP_EMAIL_LIMIT_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    });
    await consumeRateLimit({
      key: `otp:ip:${ipKey}`,
      limit: OTP_IP_LIMIT_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      await writeSecurityEvent({
        kind: "otp_rate_limited",
        requestId: input.requestId,
        meta: { emailHash: hashForTelemetry(email), ipHash: ipKey },
      });
      throw error;
    }
    throw error;
  }

  const latest = await db.query.authOtpChallenges.findFirst({
    where: and(
      eq(authOtpChallenges.email, email),
      eq(authOtpChallenges.purpose, "login"),
      isNull(authOtpChallenges.consumedAt),
    ),
    orderBy: [desc(authOtpChallenges.createdAt)],
  });
  if (
    latest &&
    Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    throw new AuthError("otp_cooldown");
  }

  const user = await ensureUserSkeleton(email, input.locale);
  if (user.status === "disabled" || user.status === "suspended") {
    await writeSecurityEvent({
      kind: "disabled_account_otp_attempt",
      userId: user.id,
      requestId: input.requestId,
      meta: { status: user.status },
    });
    return GENERIC_OTP_ACCEPTED;
  }

  const code = generateOtpCode(6);
  const now = new Date();
  await db.insert(authOtpChallenges).values({
    id: uuidv7(),
    userId: user.id,
    email,
    purpose: "login",
    codeHash: hashSecret(code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    attemptCount: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    requestMeta: {
      ipHash: ipKey,
      userAgentHash: input.userAgent ? hashForTelemetry(input.userAgent) : null,
    },
    createdAt: now,
  });

  await getEmailProvider().send({
    to: email,
    locale: input.locale,
    template: "auth.otp",
    variables: {
      code,
      expiresMinutes: String(Math.floor(OTP_TTL_MS / 60000)),
    },
  });

  await writeAudit({
    actorUserId: user.id,
    action: "OTP_REQUESTED",
    resourceType: "auth_otp_challenge",
    resourceId: email,
    requestId: input.requestId,
    ipHash: ipKey,
  });

  return GENERIC_OTP_ACCEPTED;
}

export async function verifyLoginOtp(input: {
  email: string;
  code: string;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}): Promise<{ token: string; userId: string; sessionId: string }> {
  const email = normalizeEmail(input.email);
  const db = getDb();
  const now = new Date();

  const challenge = await db.query.authOtpChallenges.findFirst({
    where: and(
      eq(authOtpChallenges.email, email),
      eq(authOtpChallenges.purpose, "login"),
      isNull(authOtpChallenges.consumedAt),
      gt(authOtpChallenges.expiresAt, now),
    ),
    orderBy: [desc(authOtpChallenges.createdAt)],
  });

  if (!challenge) {
    await writeAudit({
      action: "AUTH_LOGIN_FAILED",
      resourceType: "user",
      resourceId: email,
      requestId: input.requestId,
      reason: "otp_missing_or_expired",
      ipHash: input.ip ? hashForTelemetry(input.ip) : null,
    });
    throw new AuthError("invalid_otp");
  }

  if (challenge.attemptCount >= challenge.maxAttempts) {
    await writeSecurityEvent({
      kind: "otp_attempts_exhausted",
      userId: challenge.userId,
      requestId: input.requestId,
    });
    throw new AuthError("otp_locked");
  }

  const matches = safeEqualHex(hashSecret(input.code.trim()), challenge.codeHash);
  if (!matches) {
    await db
      .update(authOtpChallenges)
      .set({ attemptCount: challenge.attemptCount + 1 })
      .where(eq(authOtpChallenges.id, challenge.id));
    await writeAudit({
      actorUserId: challenge.userId,
      action: "AUTH_LOGIN_FAILED",
      resourceType: "auth_otp_challenge",
      resourceId: challenge.id,
      requestId: input.requestId,
      reason: "otp_mismatch",
    });
    if (challenge.attemptCount + 1 >= challenge.maxAttempts) {
      await writeSecurityEvent({
        kind: "otp_attempts_exhausted",
        userId: challenge.userId,
        requestId: input.requestId,
      });
    }
    throw new AuthError("invalid_otp");
  }

  await db
    .update(authOtpChallenges)
    .set({ consumedAt: now })
    .where(eq(authOtpChallenges.id, challenge.id));

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user || user.status !== "active") {
    await writeSecurityEvent({
      kind: "disabled_account_login_attempt",
      userId: user?.id,
      requestId: input.requestId,
      meta: { status: user?.status ?? "missing" },
    });
    throw new AuthError("account_restricted");
  }

  const { token, session } = await createSession({
    userId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
    requestId: input.requestId,
  });

  await db
    .update(users)
    .set({
      emailVerifiedAt: user.emailVerifiedAt ?? now,
      updatedAt: now,
    })
    .where(eq(users.id, user.id));
  await touchUserLogin(user.id);
  await ensureMemberRole(user.id);

  await writeAudit({
    actorUserId: user.id,
    action: "AUTH_LOGIN_SUCCESS",
    resourceType: "session",
    resourceId: session.id,
    requestId: input.requestId,
    ipHash: input.ip ? hashForTelemetry(input.ip) : null,
  });

  return { token, userId: user.id, sessionId: session.id };
}
