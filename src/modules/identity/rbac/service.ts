import { and, eq, inArray, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit, writeSecurityEvent } from "@/modules/audit";
import { getDb } from "@/shared/db/client";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/shared/db/schema";
import {
  AuthorizationError,
  assertPermission,
  hasPermission,
  type Actor,
} from "@/shared/security/authorization";
import type { Permission, RoleSlug } from "./catalog";
import { ROLE_PERMISSION_MAP, ROLE_SEEDS, PERMISSIONS } from "./catalog";

export async function getPermissionsForUser(userId: string): Promise<string[]> {
  const db = getDb();
  const assignments = await db.query.userRoles.findMany({
    where: and(eq(userRoles.userId, userId), isNull(userRoles.organizationId)),
  });
  if (assignments.length === 0) {
    return [...ROLE_PERMISSION_MAP.member];
  }
  const roleIds = assignments.map((row) => row.roleId);
  const roleRows = await db.query.roles.findMany({
    where: inArray(roles.id, roleIds),
  });
  const set = new Set<string>();
  for (const role of roleRows) {
    const mapped = ROLE_PERMISSION_MAP[role.slug as RoleSlug] ?? [];
    for (const permission of mapped) {
      set.add(permission);
    }
  }
  return [...set];
}

export async function getRolesForUser(userId: string): Promise<string[]> {
  const db = getDb();
  const assignments = await db.query.userRoles.findMany({
    where: and(eq(userRoles.userId, userId), isNull(userRoles.organizationId)),
  });
  if (assignments.length === 0) {
    return ["member"];
  }
  const roleRows = await db.query.roles.findMany({
    where: inArray(
      roles.id,
      assignments.map((row) => row.roleId),
    ),
  });
  return roleRows.map((role) => role.slug);
}

export async function buildActor(userId: string): Promise<Actor> {
  return {
    id: userId,
    permissions: await getPermissionsForUser(userId),
  };
}

export async function requireActiveUser(userId: string) {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.status !== "active") {
    throw new AuthorizationError("account_restricted");
  }
  return user;
}

export async function requirePermission(
  userId: string,
  permission: Permission | string,
): Promise<Actor> {
  await requireActiveUser(userId);
  const actor = await buildActor(userId);
  try {
    assertPermission(actor, permission);
  } catch (error) {
    await writeSecurityEvent({
      kind: "permission_denied",
      userId,
      meta: { permission },
    });
    throw error;
  }
  return actor;
}

export async function requireAnyPermission(
  userId: string,
  candidates: readonly string[],
): Promise<Actor> {
  await requireActiveUser(userId);
  const actor = await buildActor(userId);
  if (!candidates.some((permission) => hasPermission(actor, permission))) {
    await writeSecurityEvent({
      kind: "permission_denied",
      userId,
      meta: { permissions: candidates },
    });
    throw new AuthorizationError("forbidden");
  }
  return actor;
}

export async function requireRole(userId: string, roleSlug: RoleSlug): Promise<void> {
  await requireActiveUser(userId);
  const roleList = await getRolesForUser(userId);
  if (!roleList.includes(roleSlug)) {
    throw new AuthorizationError("forbidden");
  }
}

export async function assignRole(input: {
  actorUserId: string;
  targetUserId: string;
  roleSlug: RoleSlug;
  requestId?: string | null;
}): Promise<void> {
  await requirePermission(input.actorUserId, "rbac.role.grant");
  const db = getDb();
  const role = await db.query.roles.findFirst({
    where: eq(roles.slug, input.roleSlug),
  });
  if (!role) {
    throw new AuthorizationError("role_missing");
  }
  const existing = await db.query.userRoles.findFirst({
    where: and(
      eq(userRoles.userId, input.targetUserId),
      eq(userRoles.roleId, role.id),
      isNull(userRoles.organizationId),
    ),
  });
  if (existing) {
    return;
  }
  await db.insert(userRoles).values({
    id: uuidv7(),
    userId: input.targetUserId,
    roleId: role.id,
    organizationId: null,
    grantedBy: input.actorUserId,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "ROLE_ASSIGNED",
    resourceType: "user_role",
    resourceId: input.targetUserId,
    requestId: input.requestId,
    after: { role: input.roleSlug },
  });
  await writeSecurityEvent({
    kind: "privilege_change",
    userId: input.targetUserId,
    requestId: input.requestId,
    meta: { role: input.roleSlug, action: "assigned" },
  });
}

export async function seedRbacCatalog(): Promise<void> {
  const db = getDb();
  for (const permission of PERMISSIONS) {
    const existing = await db.query.permissions.findFirst({
      where: eq(permissions.slug, permission),
    });
    if (!existing) {
      await db.insert(permissions).values({
        id: uuidv7(),
        slug: permission,
        description: permission,
      });
    }
  }

  for (const role of ROLE_SEEDS) {
    let row = await db.query.roles.findFirst({ where: eq(roles.slug, role.slug) });
    if (!row) {
      await db.insert(roles).values({
        id: uuidv7(),
        slug: role.slug,
        nameAr: role.nameAr,
        nameEn: role.nameEn,
        isSystem: true,
      });
      row = await db.query.roles.findFirst({ where: eq(roles.slug, role.slug) });
    }
    if (!row) {
      continue;
    }
    const mapped = ROLE_PERMISSION_MAP[role.slug];
    for (const permissionSlug of mapped) {
      const permission = await db.query.permissions.findFirst({
        where: eq(permissions.slug, permissionSlug),
      });
      if (!permission) {
        continue;
      }
      const link = await db.query.rolePermissions.findFirst({
        where: and(
          eq(rolePermissions.roleId, row.id),
          eq(rolePermissions.permissionId, permission.id),
        ),
      });
      if (!link) {
        await db.insert(rolePermissions).values({
          id: uuidv7(),
          roleId: row.id,
          permissionId: permission.id,
        });
      }
    }
  }
}
