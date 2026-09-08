import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { getOpportunityById } from "@/modules/volunteering";
import { VolunteerApplyForm } from "@/modules/volunteering/ui/apply-form";

export const dynamic = "force-dynamic";

export default async function VolunteerOpportunityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("volunteerHub");
  const opp = await getOpportunityById(id);
  if (!opp || opp.status !== "published") {
    notFound();
  }
  const auth = await getOptionalAuthContext();

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/volunteer/opportunities" className="text-sm text-muted hover:text-navy">
        {t("back")}
      </Link>
      <h1 className="mt-4 text-4xl text-ink">
        {locale === "ar" ? opp.titleAr : opp.titleEn}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {opp.locationType}
        {opp.city ? ` · ${opp.city}` : ""}
      </p>
      <div className="prose mt-8 max-w-none text-graphite">
        <p>{locale === "ar" ? opp.descriptionAr : opp.descriptionEn}</p>
      </div>
      {auth ? (
        <div className="mt-12 border border-line bg-surface p-6">
          <h2 className="text-xl text-navy">{t("applyTitle")}</h2>
          <VolunteerApplyForm opportunityId={opp.id} />
        </div>
      ) : (
        <p className="mt-12 text-muted">
          <Link href="/login" className="text-gold-deep">
            {t("loginToApply")}
          </Link>
        </p>
      )}
    </main>
  );
}
