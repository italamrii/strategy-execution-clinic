import { NextResponse } from "next/server";
import { z } from "zod";
import { getCapturedOtpForEmail } from "@/shared/ports/email";
import { testRouteDisabled } from "@/shared/security/route-policy";

export const dynamic = "force-dynamic";

/**
 * Test-only OTP capture. Enabled only when ENABLE_TEST_OTP_ENDPOINT=true AND E2E=true.
 * Impossible in normal production (E2E is never set).
 */
export async function GET(request: Request) {
  if (testRouteDisabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const url = new URL(request.url);
  const parsed = z.string().email().safeParse(url.searchParams.get("email"));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const code = await getCapturedOtpForEmail(parsed.data);
  if (!code) {
    return NextResponse.json({ error: "otp_not_found" }, { status: 404 });
  }
  return NextResponse.json({ code });
}
