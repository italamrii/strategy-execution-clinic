import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOptionalAuthContext, requirePermission } from "@/modules/identity";
import { renderRecognitionCertificatePdf } from "@/modules/recognition";
import { getDb } from "@/shared/db/client";
import {
  certificateDefinitions,
  certificates,
  profiles,
} from "@/shared/db/schema";

function certificateVerifyUrl(publicCode: string, locale: "ar" | "en") {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${locale}/certificate/${encodeURIComponent(publicCode)}`;
}

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ certificateId: string }> },
) {
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { certificateId } = await context.params;
  const db = getDb();
  const cert = await db.query.certificates.findFirst({
    where: eq(certificates.id, certificateId),
  });
  if (!cert) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (cert.userId !== auth.userId) {
    await requirePermission(auth.userId, "certificate.read.any");
  } else {
    await requirePermission(auth.userId, "certificate.read.own");
  }
  const def = await db.query.certificateDefinitions.findFirst({
    where: eq(certificateDefinitions.id, cert.definitionId),
  });
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, cert.userId),
  });
  const locale = (auth.locale === "en" ? "en" : "ar") as "ar" | "en";
  const pdf = await renderRecognitionCertificatePdf({
    locale,
    recipientName:
      locale === "ar"
        ? profile?.displayNameAr ?? ""
        : profile?.displayNameEn ?? profile?.displayNameAr ?? "",
    title: locale === "ar" ? def?.titleAr ?? "" : def?.titleEn ?? "",
    wording:
      locale === "ar"
        ? "تشهد عيادة الاستراتيجية والتنفيذ بأن المستفيد قد حقق متطلبات الإنجاز وفق السجل المعتمد لدى العيادة."
        : "Strategy & Execution Clinic certifies that the recipient has met the achievement requirements according to the Clinic’s authoritative record.",
    publicCode: cert.publicCode,
    issuedYear: cert.issuedAt.getFullYear(),
    verificationUrl: certificateVerifyUrl(cert.publicCode, locale),
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="clinic-certificate-${cert.publicCode}.pdf"`,
      "Content-Length": String(pdf.byteLength),
    },
  });
}
