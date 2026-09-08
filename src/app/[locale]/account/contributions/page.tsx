import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import {
  getImpactBreakdown,
  listContributionTypes,
  listImpactTimeline,
  listOwnBadges,
  listOwnCertificates,
  listOwnContributions,
} from "@/modules/recognition";
import { ContributionSubmitForm } from "@/modules/recognition/ui/contribution-form";

export const dynamic = "force-dynamic";

export default async function AccountContributionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const auth = await getOptionalAuthContext();
  if (!auth) redirect({ href: "/login", locale });
  const t = await getTranslations("recognition");
  const [contribs, types, impact, timeline, badges, certs] = await Promise.all([
    listOwnContributions(auth!.userId),
    listContributionTypes(),
    getImpactBreakdown(auth!.userId),
    listImpactTimeline(auth!.userId),
    listOwnBadges(auth!.userId),
    listOwnCertificates(auth!.userId),
  ]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("portfolioTitle")}</h1>
      <p className="mt-3 max-w-2xl text-graphite">{t("portfolioSubtitle")}</p>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/account" className="text-graphite hover:text-navy">
          {t("account")}
        </Link>
        <Link href="/account/contributions" className="border-b border-gold text-navy">
          {t("portfolioTitle")}
        </Link>
      </nav>

      <section className="mt-10 grid gap-4 border border-line bg-surface p-6 md:grid-cols-4">
        <div>
          <p className="text-sm text-muted">{t("impactTotal")}</p>
          <p className="text-2xl text-navy">{impact.total}</p>
        </div>
        <div>
          <p className="text-sm text-muted">{t("impactVolunteer")}</p>
          <p className="text-xl text-navy">{impact.volunteerContribution}</p>
        </div>
        <div>
          <p className="text-sm text-muted">{t("impactContributions")}</p>
          <p className="text-xl text-navy">{impact.approvedContributions}</p>
        </div>
        <div>
          <p className="text-sm text-muted">{t("impactLeadership")}</p>
          <p className="text-xl text-navy">{impact.leadership}</p>
        </div>
      </section>

      <section className="mt-10 border border-line bg-surface p-6">
        <h2 className="text-xl text-navy">{t("submitContribution")}</h2>
        <ContributionSubmitForm
          types={types.map((type) => ({
            id: type.id,
            nameAr: type.nameAr,
            nameEn: type.nameEn,
          }))}
          locale={locale}
        />
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl text-navy">{t("myContributions")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {contribs.map((c) => (
              <li key={c.id} className="border border-line p-3">
                {locale === "ar" ? c.titleAr : c.titleEn} · {c.status}
              </li>
            ))}
            {contribs.length === 0 ? <li className="text-muted">{t("empty")}</li> : null}
          </ul>
        </div>
        <div>
          <h2 className="text-xl text-navy">{t("impactTimeline")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {timeline.map((e) => (
              <li key={e.id} className="border border-line p-3">
                {e.kind} · {e.value}
                {e.revoked ? ` (${t("revoked")})` : ""}
              </li>
            ))}
          </ul>
          <h2 className="mt-8 text-xl text-navy">{t("badges")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {badges.map((b) => (
              <li key={b.id} className="border border-line p-3">
                {b.status} · {b.publicCode}
              </li>
            ))}
          </ul>
          <h2 className="mt-8 text-xl text-navy">{t("certificates")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {certs.map((c) => (
              <li key={c.id} className="border border-line p-3" data-certificate-code={c.publicCode}>
                {c.status} · {c.publicCode}
                {c.status === "active" ? (
                  <a
                    className="ms-3 text-gold-deep"
                    href={`/api/certificates/${c.id}/pdf`}
                  >
                    {t("downloadPdf")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
