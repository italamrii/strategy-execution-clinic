import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/shared/db/client";
import { badgeAwards, users } from "@/shared/db/schema";
import { awardBadge } from "@/modules/recognition";
import { testRouteDisabled } from "@/shared/security/route-policy";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  actorEmail: z.string().email(),
  targetEmail: z.string().email(),
  badgeSlug: z.string().min(1),
  reason: z.string().min(3),
});

/**
 * Test-only badge issuance. Enabled only when ENABLE_TEST_OTP_ENDPOINT=true AND E2E=true.
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
  const actor = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.actorEmail.toLowerCase()),
  });
  const target = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.targetEmail.toLowerCase()),
  });
  if (!actor || !target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  try {
    const awardId = await awardBadge({
      actorUserId: actor.id,
      badgeSlug: parsed.data.badgeSlug,
      userId: target.id,
      reason: parsed.data.reason,
    });
    const award = await db.query.badgeAwards.findFirst({
      where: eq(badgeAwards.id, awardId),
    });
    return NextResponse.json({
      ok: true,
      awardId,
      publicCode: award?.publicCode ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "award_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
