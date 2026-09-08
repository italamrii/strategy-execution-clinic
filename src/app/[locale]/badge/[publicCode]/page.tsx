import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { verifyBadgePublicCode } from "@/modules/recognition";
import { InstitutionalBadgeMark, ShareKit } from "@/modules/recognition/ui/share-kit";

export const dynamic = "force-dynamic";

export default async function BadgeVerifyPage({
  params,
}: {
  params: Promise<{ locale: string; publicCode: string }>;
}) {
  const { locale: localeParam, publicCode } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("recognition");
  const dto = await verifyBadgePublicCode(publicCode);

  if (!dto) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-3xl text-ink">{t("badgeMissing")}</h1>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm text-gold-deep">{t("badgeVerify")}</p>
      <h1 className="mt-4 text-4xl text-ink">
        {locale === "ar" ? dto.nameAr : dto.nameEn}
      </h1>
      <p className="mt-2 text-navy">{dto.status}</p>
      <dl className="mt-8 space-y-3 text-sm">
        <div className="flex justify-between gap-4 border-b border-line py-2">
          <dt className="text-muted">{t("recipient")}</dt>
          <dd>{locale === "ar" ? dto.recipientNameAr : dto.recipientNameEn ?? dto.recipientNameAr}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-line py-2">
          <dt className="text-muted">{t("issuer")}</dt>
          <dd>{dto.issuerName}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-line py-2">
          <dt className="text-muted">{t("publicCode")}</dt>
          <dd className="font-mono">{dto.publicCode}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-line py-2">
          <dt className="text-muted">{t("issuedAt")}</dt>
          <dd>{dto.issuedAt.slice(0, 10)}</dd>
        </div>
      </dl>
      <div className="mt-8">
        <InstitutionalBadgeMark name={locale === "ar" ? dto.nameAr : dto.nameEn} publicCode={dto.publicCode} />
      </div>
      <p className="mt-6 text-graphite">
        {locale === "ar" ? dto.criteriaAr : dto.criteriaEn}
      </p>
      <ShareKit
        kind="badge"
        publicCode={dto.publicCode}
        locale={locale}
        copyLabel={t("copyVerify")}
        pngLabel={t("sharePng")}
        linkedInLabel={t("shareLinkedIn")}
      />
    </main>
  );
}
