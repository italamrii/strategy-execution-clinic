import { NextResponse } from "next/server";
import { writeAudit } from "@/modules/audit";
import {
  assertOwnCredential,
  renderCardPng,
  renderCardSheetPdf,
  renderCertificatePdf,
  renderLinkedInPng,
} from "@/modules/credentials";
import { buildCardRenderInputForCredential } from "@/modules/credentials/card-data";
import { requireAuthenticatedPermission } from "@/modules/identity";
import { getTranslations } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AuthorizationError } from "@/shared/security/authorization";
import { CredentialError } from "@/modules/credentials/errors";
import { buildVerificationUrl } from "@/modules/credentials/qr";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ credentialId: string; format: string }> },
) {
  const { credentialId, format } = await context.params;
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale") ?? "ar";
  const locale = requireLocale(localeParam);
  const variant = url.searchParams.get("variant") ?? "card";

  try {
    const auth = await requireAuthenticatedPermission("credential.asset.generate");
    await assertOwnCredential(auth.userId, credentialId);
    const t = await getTranslations({ locale, namespace: "credential" });
    const input = await buildCardRenderInputForCredential(credentialId, locale, (key) =>
      t(key as "statusActive" | "statusSuspended" | "statusExpired" | "statusRevoked"),
    );

    let body: Buffer;
    let mime = "application/octet-stream";
    let filename = `sec-credential-${input.publicCode}`;

    if (format === "png") {
      body =
        variant === "square" || variant === "portrait" || variant === "landscape"
          ? await renderLinkedInPng(input, variant)
          : await renderCardPng(input);
      mime = "image/png";
      filename += ".png";
      await writeAudit({
        actorUserId: auth.userId,
        action: "CREDENTIAL_PNG_GENERATED",
        resourceType: "credential",
        resourceId: credentialId,
      });
    } else if (format === "pdf") {
      if (variant === "certificate") {
        body = await renderCertificatePdf(
          {
            ...input,
            issuedAtLabel: new Date().toLocaleDateString(locale),
            verificationUrl: buildVerificationUrl(input.publicCode, locale),
          },
          locale,
        );
      } else {
        body = await renderCardSheetPdf(input);
      }
      mime = "application/pdf";
      filename += ".pdf";
      await writeAudit({
        actorUserId: auth.userId,
        action: "CREDENTIAL_PDF_GENERATED",
        resourceType: "credential",
        resourceId: credentialId,
      });
    } else {
      return NextResponse.json({ error: "unsupported_format" }, { status: 400 });
    }

    const embed = url.searchParams.get("embed") === "1";
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${embed && mime === "image/png" ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof CredentialError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }
}
