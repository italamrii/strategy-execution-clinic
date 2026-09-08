import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { listPublicOpportunities } from "@/modules/volunteering";
import { SectionHeader, VolunteerJourney } from "@/shared/ui/public-sections";

export const dynamic = "force-dynamic";

export default async function VolunteerLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations();
  const { items } = await listPublicOpportunities({ page: 1, pageSize: 3 });
  const steps = [1, 2, 3, 4, 5].map((step) => t(`home.volunteerStep${step}`));
  return (
    <main id="main" className="volunteer-landing">
      <section className="volunteer-landing__hero">
        <div className="site-container">
          <p className="eyebrow">{t("volunteerHub.eyebrow")}</p>
          <h1>{t("volunteerHub.slogan")}</h1>
          <p>{t("volunteerHub.lede")}</p>
          <div className="action-row"><Link className="institutional-button institutional-button--primary" href="/volunteer/opportunities">{t("volunteerHub.browseOpportunities")}</Link><Link className="institutional-button institutional-button--secondary" href="/account/volunteer">{t("volunteerHub.myDashboard")}</Link></div>
        </div>
      </section>
      <section className="institutional-section volunteer-landing__journey">
        <div className="site-container"><SectionHeader index="01" title={t("home.volunteerTitle")} body={t("home.volunteerBody")} /><VolunteerJourney steps={steps} /></div>
      </section>
      <section className="institutional-section volunteer-landing__opportunities">
        <div className="site-container">
          <SectionHeader index="02" title={t("volunteerHub.featured")} />
          {items.length ? <ul>{items.map((opp) => <li key={opp.id}><p className="eyebrow">{opp.locationType}</p><h3>{locale === "ar" ? opp.titleAr : opp.titleEn}</h3><Link className="text-action" href={`/volunteer/opportunities/${opp.id}`}>{t("volunteerHub.viewOpportunity")}<span aria-hidden>↗</span></Link></li>)}</ul> : <div className="intentional-empty"><span className="numeric">SEC · 00</span><div><h3>{t("volunteerHub.noOpportunities")}</h3><p>{t("volunteerHub.emptyStateBody")}</p></div><Link className="institutional-button institutional-button--secondary" href="/account/volunteer">{t("volunteerHub.myDashboard")}</Link></div>}
        </div>
      </section>
    </main>
  );
}
