import { NextResponse } from "next/server";
import { generateQrSvg } from "@/modules/credentials";
import {
  getShareCardPayload,
  renderAchievementPng,
  safeShareFilename,
  shareCaptions,
} from "@/modules/recognition";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string; publicCode: string }> },
) {
  const { kind, publicCode } = await context.params;
  if (kind !== "badge" && kind !== "certificate") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const variantParam = url.searchParams.get("variant") ?? "square";
  const locale = url.searchParams.get("locale") === "en" ? "en" : "ar";
  const variant =
    variantParam === "portrait" || variantParam === "landscape" ? variantParam : "square";
  const payload = await getShareCardPayload({ kind, publicCode, locale });
  if (!payload) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const qrSvg = await generateQrSvg(payload.verificationUrl);
  const png = await renderAchievementPng(
    {
      locale,
      title: payload.title,
      subtitle: payload.subtitle,
      publicCode: payload.publicCode,
      metricLabel: payload.metricLabel,
      metricValue: payload.metricValue,
      qrSvg,
    },
    variant,
  );
  const captions = shareCaptions({
    locale,
    title: payload.title,
    publicCode: payload.publicCode,
    verificationUrl: payload.verificationUrl,
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${safeShareFilename(kind, payload.publicCode, variant)}"`,
      "Content-Length": String(png.byteLength),
      "X-Share-Caption": encodeURIComponent(captions.caption),
      "X-LinkedIn-Share": captions.linkedInShareUrl,
      "Cache-Control": "no-store",
    },
  });
}
