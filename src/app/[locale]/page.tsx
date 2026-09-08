import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getPublicMembershipTypes, getPublicTracks } from "@/modules/membership";
import { getPublishedContentBySlug } from "@/modules/content";
import { EditorialGrid, Hero, MembershipPreview, SectionHeader, SiteFooter, TrackItem, VolunteerJourney } from "@/shared/ui/public-sections";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations();
  const isAr = locale === "ar";
  const hero = await getPublishedContentBySlug("home.hero");
  const headline = hero ? (isAr ? hero.titleAr : hero.titleEn) : t("home.headline");
  const lede = hero ? (isAr ? hero.bodyAr : hero.bodyEn) : t("home.lede");
  const tracks = getPublicTracks();
  const types = getPublicMembershipTypes().filter((type) => ["founding_member", "expert_member", "professional_member", "volunteer_member"].includes(type.slug));
  const trackDescriptions = t.raw("home.trackDescriptions") as string[];
  const steps = [1, 2, 3, 4, 5].map((step) => t(`home.volunteerStep${step}`));

  return (
    <main id="main" aria-label={t("a11y.main")}>
      <Hero eyebrow={t("home.eyebrow")} headline={headline} lede={lede} primary={t("home.primaryCta")} secondary={t("home.secondaryCta")} trust={t("home.trustLine")} />
      <section className="institutional-section institutional-section--statement">
        <div className="site-container statement-grid">
          <SectionHeader index="01" title={t("home.whatTitle")} />
          <div className="statement-copy"><p className="statement-copy__lead">{t("home.whatStatement")}</p><p>{t("home.whatBody")}</p></div>
        </div>
      </section>
      <section className="institutional-section institutional-section--white" id="tracks">
        <div className="site-container">
          <SectionHeader index="02" title={t("home.tracksTitle")} body={t("home.tracksBodyNew")} />
          <EditorialGrid>{tracks.map((track, index) => <TrackItem key={track.slug} index={index} title={isAr ? track.nameAr : track.nameEn} description={trackDescriptions[index]} />)}</EditorialGrid>
        </div>
      </section>
      <section className="institutional-section">
        <div className="site-container">
          <SectionHeader index="03" title={t("home.membershipTitle")} body={t("home.membershipBody")} />
          <MembershipPreview types={types} locale={locale} verifiedLabel={t("home.verifiedMembership")} codeLabel={t("home.membershipCode")} />
          <Link className="text-action" href="/membership">{t("home.exploreMembership")}<span aria-hidden>←</span></Link>
        </div>
      </section>
      <section className="institutional-section volunteer-feature">
        <div className="site-container volunteer-feature__grid">
          <div>
            <SectionHeader index="04" title={t("home.volunteerSlogan")} body={t("home.volunteerBody")} inverse />
            <VolunteerJourney steps={steps} />
            <Link className="institutional-button institutional-button--light" href="/volunteer/opportunities">{t("volunteerHub.browseOpportunities")}<span aria-hidden>↗</span></Link>
          </div>
          <aside className="impact-ledger" aria-label={t("home.impactLedgerTitle")}>
            <p className="eyebrow">{t("home.impactLedgerEyebrow")}</p><h3>{t("home.impactLedgerTitle")}</h3>
            <ul>{(t.raw("home.impactLedgerItems") as string[]).map((item) => <li key={item}>{item}<span aria-hidden>✓</span></li>)}</ul>
          </aside>
        </div>
      </section>
      <section className="institutional-section institutional-section--community">
        <div className="site-container community-grid">
          <SectionHeader index="05" title={t("home.expertsTitle")} body={t("home.expertsBody")} />
          <div className="community-roles" aria-hidden>{["01", "02", "03", "04"].map((value) => <span key={value} className="numeric">{value}</span>)}</div>
          <Link className="institutional-button institutional-button--secondary" href="/members">{t("nav.members")}<span aria-hidden>↗</span></Link>
        </div>
      </section>
      <section className="institutional-section join-band">
        <div className="site-container join-band__grid">
          <div><p className="eyebrow">06 · SEC</p><h2>{t("home.joinTitle")}</h2><p>{t("home.joinBody")}</p></div>
          <div className="action-row"><Link className="institutional-button institutional-button--primary" href="/membership/apply">{t("home.primaryCta")}</Link><Link className="institutional-button institutional-button--secondary" href="/contact">{t("nav.contact")}</Link></div>
        </div>
      </section>
      <SiteFooter label={t("home.footer")} about={t("nav.about")} contact={t("nav.contact")} verify={t("nav.verify")} />
    </main>
  );
}
