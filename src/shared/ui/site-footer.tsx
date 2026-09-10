import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations();
  return (
    <footer className="site-footer">
      <div className="site-container site-footer__grid">
        <div className="wordmark wordmark--footer">
          <strong>عيادة الاستراتيجية والتنفيذ</strong>
          <span>STRATEGY &amp; EXECUTION CLINIC</span>
        </div>
        <p>{t("home.footer")}</p>
        <nav aria-label={t("nav.policies")}>
          <Link href="/about">{t("nav.about")}</Link>
          <Link href="/how-it-works">{t("nav.howItWorks")}</Link>
          <Link href="/tracks">{t("nav.tracks")}</Link>
          <Link href="/membership">{t("nav.membership")}</Link>
          <Link href="/consultations">{t("nav.consultations")}</Link>
          <Link href="/knowledge">{t("nav.knowledge")}</Link>
          <Link href="/volunteer">{t("nav.volunteer")}</Link>
          <Link href="/contact">{t("nav.support")}</Link>
          <Link href="/policies">{t("nav.policies")}</Link>
          <Link href="/verify">{t("nav.verify")}</Link>
        </nav>
      </div>
    </footer>
  );
}
