import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/shared/db/client";
import { roles, userRoles, users } from "@/shared/db/schema";
import { testRouteDisabled } from "@/shared/security/route-policy";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "membership_admin",
    "volunteer_admin",
    "volunteer_leader",
    "reviewer",
    "super_admin",
    "member",
  ]),
});

/**
 * Test-only role grant. Enabled only when ENABLE_TEST_OTP_ENDPOINT=true AND E2E=true.
 */
export async function POST(request: Request) {
  if (testRouteDisabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email.toLowerCase()),
  });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  const role = await db.query.roles.findFirst({
    where: eq(roles.slug, parsed.data.role),
  });
  if (!role) {
    return NextResponse.json({ error: "role_not_found" }, { status: 404 });
  }
  const existing = await db.query.userRoles.findFirst({
    where: eq(userRoles.userId, user.id),
  });
  if (!existing) {
    await db.insert(userRoles).values({
      id: uuidv7(),
      userId: user.id,
      roleId: role.id,
      organizationId: null,
      grantedBy: null,
    });
  } else {
    await db
      .update(userRoles)
      .set({ roleId: role.id })
      .where(eq(userRoles.id, existing.id));
  }
  return NextResponse.json({ ok: true, userId: user.id, role: parsed.data.role });
}
