import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { listPublicOpportunities } from "@/modules/volunteering";

export const dynamic = "force-dynamic";

export default async function VolunteerOpportunitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("volunteerHub");
  const sp = await searchParams;
  const locationType = typeof sp.location === "string" ? sp.location : undefined;
  const { items } = await listPublicOpportunities({
    locationType,
    page: 1,
    pageSize: 24,
  });

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/volunteer" className="text-sm text-muted hover:text-navy">
        {t("back")}
      </Link>
      <h1 className="mt-4 text-4xl text-ink">{t("opportunitiesTitle")}</h1>
      <form className="mt-8 flex flex-wrap gap-3">
        <select name="location" defaultValue={locationType ?? ""} className="border border-line px-3 py-2">
          <option value="">{t("allLocations")}</option>
          <option value="remote">{t("remote")}</option>
          <option value="onsite">{t("onsite")}</option>
          <option value="hybrid">{t("hybrid")}</option>
        </select>
        <button type="submit" className="border border-navy bg-navy px-4 py-2 text-surface">
          {t("filter")}
        </button>
      </form>
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {items.map((opp) => (
          <li key={opp.id} className="border border-line bg-surface p-6">
            <h2 className="text-xl text-navy">
              {locale === "ar" ? opp.titleAr : opp.titleEn}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {opp.locationType}
              {opp.expectedHours ? ` · ${opp.expectedHours}h` : ""}
            </p>
            <Link
              href={`/volunteer/opportunities/${opp.id}`}
              className="mt-4 inline-block text-gold-deep"
            >
              {t("viewOpportunity")}
            </Link>
          </li>
        ))}
      </ul>
      {items.length === 0 ? <p className="mt-10 text-muted">{t("noOpportunities")}</p> : null}
    </main>
  );
}
