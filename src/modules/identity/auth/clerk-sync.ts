import { and, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit, writeSecurityEvent } from "@/modules/audit";
import { getDb } from "@/shared/db/client";
import {
  profileContacts,
  profiles,
  roles,
  userRoles,
  users,
} from "@/shared/db/schema";
import { normalizeEmail } from "../crypto";

export class ClerkMappingError extends Error {
  readonly code: string;
  constructor(code: string, message = code) {
    super(message);
    this.name = "ClerkMappingError";
    this.code = code;
  }
}

export type ClerkIdentity = {
  clerkUserId: string;
  email: string;
  locale?: "ar" | "en";
};

export type LocalUserRecord = {
  id: string;
  email: string;
  clerkUserId: string | null;
  status: string;
  locale: string;
};

export type MappingPlan =
  | { action: "reuse"; user: LocalUserRecord }
  | { action: "link"; user: LocalUserRecord }
  | { action: "create" }
  | { action: "conflict"; reason: string };

/**
 * Pure mapping decision: never replace local UUIDs with Clerk IDs.
 */
export function planClerkUserMapping(input: {
  clerkUserId: string;
  email: string;
  byClerkId: LocalUserRecord | null;
  byEmail: LocalUserRecord | null;
}): MappingPlan {
  const email = normalizeEmail(input.email);
  if (!email) {
    return { action: "conflict", reason: "missing_email" };
  }

  if (input.byClerkId) {
    if (normalizeEmail(input.byClerkId.email) !== email) {
      return { action: "conflict", reason: "clerk_id_email_mismatch" };
    }
    return { action: "reuse", user: input.byClerkId };
  }

  if (input.byEmail) {
    if (input.byEmail.clerkUserId && input.byEmail.clerkUserId !== input.clerkUserId) {
      return { action: "conflict", reason: "email_bound_to_other_clerk_user" };
    }
    return { action: "link", user: input.byEmail };
  }

  return { action: "create" };
}

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

/**
 * Conditionally ensure super_admin role for bootstrap user.
 * Only assigns if BOOTSTRAP_CONFIRM==='YES' and normalized email matches BOOTSTRAP_ADMIN_EMAIL.
 * Idempotent: does nothing if role already assigned.
 * Writes audit event when newly assigned.
 */
async function ensureBootstrapSuperAdmin(
  userId: string,
  userEmail: string,
  requestId: string | null,
): Promise<void> {
  const bootstrapConfirm = process.env.BOOTSTRAP_CONFIRM;
  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;

  // Only proceed if BOOTSTRAP_CONFIRM is explicitly 'YES'
  if (bootstrapConfirm !== "YES" || !bootstrapAdminEmail) {
    return;
  }

  const normalizedUserEmail = normalizeEmail(userEmail);
  const normalizedBootstrapEmail = normalizeEmail(bootstrapAdminEmail);

  if (!normalizedUserEmail || !normalizedBootstrapEmail) {
    return;
  }

  // Only assign if emails match (case-insensitive after normalization)
  if (normalizedUserEmail !== normalizedBootstrapEmail) {
    return;
  }

  const db = getDb();
  const superAdminRole = await db.query.roles.findFirst({
    where: eq(roles.slug, "super_admin"),
  });
  if (!superAdminRole) {
    return;
  }

  const existing = await db.query.userRoles.findFirst({
    where: and(
      eq(userRoles.userId, userId),
      eq(userRoles.roleId, superAdminRole.id),
      isNull(userRoles.organizationId),
    ),
  });
  if (existing) {
    // Already assigned, idempotent
    return;
  }

  // Assign super_admin role
  await db.insert(userRoles).values({
    id: uuidv7(),
    userId,
    roleId: superAdminRole.id,
    organizationId: null,
    grantedBy: null,
  });

  // Write audit event for bootstrap super_admin assignment
  await writeAudit({
    actorUserId: userId,
    action: "BOOTSTRAP_SUPER_ADMIN_ASSIGNED",
    resourceType: "user_role",
    resourceId: userId,
    requestId,
    after: { role: "super_admin", bootstrap: true },
  });

  await writeSecurityEvent({
    kind: "privilege_change",
    userId,
    requestId,
    meta: { role: "super_admin", action: "bootstrap_assigned" },
  });
}

async function createLocalUserSkeleton(
  email: string,
  clerkUserId: string,
  locale: "ar" | "en",
  requestId: string | null,
): Promise<LocalUserRecord> {
  const db = getDb();
  const id = uuidv7();
  const now = new Date();
  await db.insert(users).values({
    id,
    email,
    clerkUserId,
    locale,
    status: "active",
    emailVerifiedAt: now,
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
  await ensureBootstrapSuperAdmin(id, email, requestId);
  return {
    id,
    email,
    clerkUserId,
    status: "active",
    locale,
  };
}

function toLocalUser(row: typeof users.$inferSelect): LocalUserRecord {
  return {
    id: row.id,
    email: row.email,
    clerkUserId: row.clerkUserId,
    status: row.status,
    locale: row.locale,
  };
}

/**
 * Map a Clerk identity onto the local users table.
 * Preserves local UUIDs, roles, memberships, and credentials.
 * Applies bootstrap super_admin role if conditions are met.
 */
export async function syncClerkIdentityToLocalUser(
  identity: ClerkIdentity,
  options?: {
    requestId?: string | null;
    auditLogin?: boolean;
    touchLogin?: boolean;
  },
): Promise<LocalUserRecord> {
  const db = getDb();
  const email = normalizeEmail(identity.email);
  const locale = identity.locale ?? "ar";
  const requestId = options?.requestId ?? null;

  if (!identity.clerkUserId || !email) {
    await writeAudit({
      action: "AUTH_MAPPING_FAILED",
      resourceType: "clerk_user",
      resourceId: identity.clerkUserId || "missing",
      requestId,
      reason: "missing_clerk_identity",
    });
    throw new ClerkMappingError("mapping_failed");
  }

  const byClerkIdRow = await db.query.users.findFirst({
    where: eq(users.clerkUserId, identity.clerkUserId),
  });
  const byEmailRow = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  const plan = planClerkUserMapping({
    clerkUserId: identity.clerkUserId,
    email,
    byClerkId: byClerkIdRow ? toLocalUser(byClerkIdRow) : null,
    byEmail: byEmailRow ? toLocalUser(byEmailRow) : null,
  });

  if (plan.action === "conflict") {
    await writeAudit({
      action: "AUTH_MAPPING_FAILED",
      resourceType: "clerk_user",
      resourceId: identity.clerkUserId,
      requestId,
      reason: plan.reason,
    });
    throw new ClerkMappingError("mapping_failed", plan.reason);
  }

  let local: LocalUserRecord;
  const now = new Date();

  if (plan.action === "create") {
    local = await createLocalUserSkeleton(email, identity.clerkUserId, locale, requestId);
  } else if (plan.action === "link") {
    await db
      .update(users)
      .set({
        clerkUserId: identity.clerkUserId,
        emailVerifiedAt: byEmailRow?.emailVerifiedAt ?? now,
        updatedAt: now,
      })
      .where(eq(users.id, plan.user.id));
    local = { ...plan.user, clerkUserId: identity.clerkUserId };
    await ensureMemberRole(local.id);
    await ensureBootstrapSuperAdmin(local.id, local.email, requestId);
  } else {
    local = plan.user;
    await ensureMemberRole(local.id);
    await ensureBootstrapSuperAdmin(local.id, local.email, requestId);
  }

  if (local.status !== "active") {
    await writeSecurityEvent({
      kind: "blocked_account_clerk_session",
      userId: local.id,
      requestId,
      meta: { status: local.status },
    });
    await writeAudit({
      actorUserId: local.id,
      action: "AUTH_ACCOUNT_BLOCKED",
      resourceType: "user",
      resourceId: local.id,
      requestId,
      reason: local.status,
    });
    throw new ClerkMappingError("account_restricted");
  }

  if (options?.touchLogin || options?.auditLogin) {
    await db
      .update(users)
      .set({
        lastLoginAt: now,
        updatedAt: now,
        emailVerifiedAt: now,
      })
      .where(eq(users.id, local.id));
  }

  if (options?.auditLogin) {
    await writeAudit({
      actorUserId: local.id,
      action: "AUTH_LOGIN_SUCCESS",
      resourceType: "clerk_session",
      resourceId: identity.clerkUserId,
      requestId,
    });
  }

  return local;
}

