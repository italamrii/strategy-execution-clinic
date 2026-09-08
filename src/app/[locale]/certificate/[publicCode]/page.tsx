import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { verifyCertificatePublicCode } from "@/modules/recognition";
import { ShareKit } from "@/modules/recognition/ui/share-kit";

export const dynamic = "force-dynamic";

export default async function CertificateVerifyPage({
  params,
}: {
  params: Promise<{ locale: string; publicCode: string }>;
}) {
  const { locale: localeParam, publicCode } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("recognition");
  const dto = await verifyCertificatePublicCode(publicCode);

  if (!dto) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-3xl text-ink">{t("certificateMissing")}</h1>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm text-gold-deep">{t("certificateVerify")}</p>
      <h1 className="mt-4 text-4xl text-ink">
        {locale === "ar" ? dto.titleAr : dto.titleEn}
      </h1>
      <p className="mt-2 text-navy">{dto.status}</p>
      <p className="mt-8 text-xl text-ink">
        {locale === "ar" ? dto.recipientNameAr : dto.recipientNameEn ?? dto.recipientNameAr}
      </p>
      <p className="mt-6 text-graphite">{locale === "ar" ? dto.wordingAr : dto.wordingEn}</p>
      <p className="mt-8 font-mono text-sm text-gold-deep">{dto.publicCode}</p>
      <p className="mt-2 text-sm text-muted">{dto.issuedAt.slice(0, 10)}</p>
      <ShareKit
        kind="certificate"
        publicCode={dto.publicCode}
        locale={locale}
        copyLabel={t("copyVerify")}
        pngLabel={t("sharePng")}
        linkedInLabel={t("shareLinkedIn")}
      />
    </main>
  );
}
