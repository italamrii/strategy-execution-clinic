import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { getDb } from "@/shared/db/client";
import { profileContacts, profiles, roles, userRoles, users } from "@/shared/db/schema";
import { normalizeEmail } from "./crypto";
import { seedRbacCatalog } from "./rbac/service";

/**
 * Deliberate one-time bootstrap. Never expose as a public HTTP endpoint.
 * Requires BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_CONFIRM=YES.
 */
export async function bootstrapSuperAdmin(input?: {
  email?: string;
  confirm?: string;
}): Promise<{ userId: string; email: string }> {
  const email = normalizeEmail(
    input?.email ?? process.env.BOOTSTRAP_ADMIN_EMAIL ?? "",
  );
  const confirm = input?.confirm ?? process.env.BOOTSTRAP_CONFIRM ?? "";
  if (!email) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL is required");
  }
  if (confirm !== "YES") {
    throw new Error("BOOTSTRAP_CONFIRM=YES is required for deliberate bootstrap");
  }

  await seedRbacCatalog();
  const db = getDb();
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  const now = new Date();
  if (!user) {
    const id = uuidv7();
    await db.insert(users).values({
      id,
      email,
      locale: "ar",
      status: "active",
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(profiles).values({
      id: uuidv7(),
      userId: id,
      displayNameAr: "مدير أعلى",
      displayNameEn: "Super Admin",
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
    user = await db.query.users.findFirst({ where: eq(users.id, id) });
  }
  if (!user) {
    throw new Error("bootstrap user create failed");
  }

  const superRole = await db.query.roles.findFirst({
    where: eq(roles.slug, "super_admin"),
  });
  const memberRole = await db.query.roles.findFirst({
    where: eq(roles.slug, "member"),
  });
  if (!superRole) {
    throw new Error("super_admin role missing after seed");
  }

  for (const role of [memberRole, superRole].filter(Boolean)) {
    if (!role) continue;
    const existing = await db.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, user.id), eq(userRoles.roleId, role.id)),
    });
    if (!existing) {
      await db.insert(userRoles).values({
        id: uuidv7(),
        userId: user.id,
        roleId: role.id,
        organizationId: null,
        grantedBy: user.id,
      });
    }
  }

  await writeAudit({
    actorUserId: user.id,
    action: "ROLE_ASSIGNED",
    resourceType: "user",
    resourceId: user.id,
    reason: "bootstrap_super_admin",
    after: { role: "super_admin", email },
  });

  return { userId: user.id, email: user.email };
}
