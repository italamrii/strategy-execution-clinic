import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/shared/db/client";
import { countFailedNotifications } from "@/modules/notifications";

export const dynamic = "force-dynamic";

/**
 * Readiness probe. Public response stays minimal.
 * Rich diagnostics require OPS_READINESS_TOKEN header in staging/production.
 */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const token = request.headers.get("x-ops-readiness-token");
  const privileged =
    Boolean(process.env.OPS_READINESS_TOKEN) &&
    token === process.env.OPS_READINESS_TOKEN;

  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    if (!privileged) {
      return NextResponse.json({ ok: true, database: "up" });
    }
    const failedNotifications = await countFailedNotifications();
    return NextResponse.json({
      ok: true,
      checks: {
        database: "up",
        failedNotifications,
        environment: process.env.APP_ENV ?? process.env.NODE_ENV,
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
