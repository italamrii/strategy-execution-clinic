import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import {
  getPublicMemberProfileByCredentialCode,
  getPublicMemberProfileByHandle,
  publicMemberProfileLeaksPrivate,
} from "@/modules/recognition";
import { InstitutionalBadgeMark, ShareKit } from "@/modules/recognition/ui/share-kit";

export const dynamic = "force-dynamic";

export default async function PublicMembersHandlePage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale: localeParam, handle } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("recognition");

  const looksLikeCredential = handle.toUpperCase().startsWith("SEC-");
  const dto = looksLikeCredential
    ? await getPublicMemberProfileByCredentialCode(handle)
    : await getPublicMemberProfileByHandle(handle);

  if (!dto || publicMemberProfileLeaksPrivate(dto)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-3xl text-ink">{t("profileMissing")}</h1>
      </main>
    );
  }

  const name = locale === "ar" ? dto.displayNameAr : dto.displayNameEn ?? dto.displayNameAr;

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm tracking-[0.18em] text-gold-deep">
        {locale === "ar" ? "عيادة الاستراتيجية والتنفيذ" : "Strategy & Execution Clinic"}
      </p>
      <h1 className="mt-4 text-4xl text-ink">{name}</h1>
      {dto.headlineAr || dto.headlineEn ? (
        <p className="mt-3 text-lg text-graphite">
          {locale === "ar" ? dto.headlineAr : dto.headlineEn}
        </p>
      ) : null}
      {dto.bioAr || dto.bioEn ? (
        <p className="mt-6 text-graphite">{locale === "ar" ? dto.bioAr : dto.bioEn}</p>
      ) : null}

      <section className="mt-10 border border-line bg-surface p-6">
        <h2 className="text-xl text-navy">{t("membership")}</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {dto.membershipTypes.map((m, i) => (
            <li key={i}>
              {locale === "ar" ? m.nameAr : m.nameEn} · {m.status}
            </li>
          ))}
        </ul>
        {dto.credentialPublicCode ? (
          <Link
            href={`/verify/${dto.credentialPublicCode}`}
            className="mt-4 inline-block text-gold-deep"
          >
            {t("verifyCredential")}
          </Link>
        ) : null}
      </section>

      {dto.approvedVolunteerHours != null ? (
        <p className="mt-6 text-navy">
          {t("approvedHours")}: {dto.approvedVolunteerHours}
        </p>
      ) : null}
      {dto.impactScore != null ? (
        <p className="mt-2 text-navy">
          {t("impactScore")}: {dto.impactScore}
        </p>
      ) : null}

      {dto.contributions.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl text-navy">{t("contributions")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dto.contributions.map((c, i) => (
              <li key={i} className="border border-line p-3">
                {locale === "ar" ? c.titleAr : c.titleEn}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {dto.badges.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl text-navy">{t("badges")}</h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {dto.badges.map((b, i) => (
              <li key={i} className="flex items-center gap-3 border border-gold/40 bg-surface px-4 py-3 text-sm">
                <InstitutionalBadgeMark name={locale === "ar" ? b.nameAr : b.nameEn} publicCode={b.publicCode} />
                <div>
                  <p>{locale === "ar" ? b.nameAr : b.nameEn}</p>
                  {b.publicCode ? (
                    <>
                      <Link href={`/badge/${b.publicCode}`} className="text-gold-deep">
                        {t("verify")}
                      </Link>
                      <ShareKit
                        kind="badge"
                        publicCode={b.publicCode}
                        locale={locale}
                        copyLabel={t("copyVerify")}
                        pngLabel={t("sharePng")}
                        linkedInLabel={t("shareLinkedIn")}
                      />
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {dto.certificates.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl text-navy">{t("certificates")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dto.certificates.map((c, i) => (
              <li key={i} className="border border-line p-3">
                {locale === "ar" ? c.titleAr : c.titleEn}
                <Link href={`/certificate/${c.publicCode}`} className="ms-2 text-gold-deep">
                  {t("verify")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
