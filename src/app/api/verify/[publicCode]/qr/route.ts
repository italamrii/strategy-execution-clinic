import { NextResponse } from "next/server";
import { buildVerificationUrl, generateQrPngBuffer } from "@/modules/credentials/qr";
import { isValidPublicCodeFormat } from "@/modules/credentials/public-code";
import { requireLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ publicCode: string }> },
) {
  const { publicCode } = await context.params;
  const normalized = publicCode.trim().toUpperCase();
  if (!isValidPublicCodeFormat(normalized)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const url = new URL(request.url);
  const locale = requireLocale(url.searchParams.get("locale") ?? "ar");
  const verifyUrl = buildVerificationUrl(normalized, locale);
  const body = await generateQrPngBuffer(verifyUrl, 512);

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
