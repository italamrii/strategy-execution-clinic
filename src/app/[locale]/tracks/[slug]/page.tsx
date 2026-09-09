import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { getPublicTrackPage, TrackError } from "@/modules/tracks";
import { TrackApplyForm } from "@/modules/tracks/ui/track-apply-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("tracks");
  const isAr = locale === "ar";
  let page;
  try {
    page = await getPublicTrackPage(slug);
  } catch (error) {
    if (error instanceof TrackError) notFound();
    throw error;
  }
  const auth = await getOptionalAuthContext();
  const { track, leaders, roster, contributions, initiatives, events, impact } = page;
  const primary = leaders.find((row) => row.leadershipRole === "primary");
  const deputies = leaders.filter((row) => row.leadershipRole === "deputy");

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/tracks" className="text-sm text-graphite hover:text-navy">
        {t("backToDirectory")}
      </Link>
      <p className="mt-6 eyebrow">SEC · {track.code}</p>
      <h1 className="mt-3 text-4xl text-ink">{isAr ? track.nameAr : track.nameEn}</h1>
      <p className="mt-4 max-w-3xl text-graphite">
        {isAr ? track.purposeAr : track.purposeEn}
      </p>
      <p className="mt-3 max-w-3xl text-sm text-muted">
        {isAr ? track.scopeAr : track.scopeEn}
      </p>

      <section className="mt-12 grid gap-4 md:grid-cols-4">
        <Metric label={t("members")} value={impact.members} />
        <Metric label={t("publishedContributions")} value={impact.publishedContributions} />
        <Metric label={t("activeInitiatives")} value={impact.activeInitiatives} />
        <Metric label={t("upcomingEvents")} value={impact.upcomingEvents} />
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl text-navy">{t("leadership")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {primary ? (
              <li>
                <strong>{t("groupLeader")}:</strong>{" "}
                {isAr ? primary.displayNameAr : primary.displayNameEn}
              </li>
            ) : (
              <li className="text-muted">{t("noLeader")}</li>
            )}
            {deputies.map((deputy) => (
              <li key={deputy.id}>
                <strong>{t("deputy")}:</strong>{" "}
                {isAr ? deputy.displayNameAr : deputy.displayNameEn}
              </li>
            ))}
          </ul>
          <h2 className="mt-8 text-2xl text-navy">{t("community")}</h2>
          <ul className="mt-4 space-y-1 text-sm text-graphite">
            {roster.slice(0, 12).map((member) => (
              <li key={member.id}>
                {isAr ? member.displayNameAr : member.displayNameEn} · {member.role}
                {member.isPrimary ? ` · ${t("primaryBadge")}` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div>
          {auth ? (
            track.applicationsOpen ? (
              <TrackApplyForm trackId={track.id} />
            ) : (
              <p className="border border-line bg-surface p-6 text-sm text-muted">
                {t("applicationsClosed")}
              </p>
            )
          ) : (
            <p className="border border-line bg-surface p-6 text-sm">
              <Link href="/login" className="text-navy underline">
                {t("loginToApply")}
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl text-navy">{t("publishedContributions")}</h2>
        <ul className="mt-4 divide-y divide-line border border-line bg-surface">
          {contributions.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              <strong>{isAr ? item.titleAr : item.titleEn}</strong>
              <span className="ms-2 text-muted">{item.contributionType}</span>
            </li>
          ))}
          {contributions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">{t("emptyContributions")}</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl text-navy">{t("activeInitiatives")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {initiatives.map((item) => (
              <li key={item.id}>{isAr ? item.titleAr : item.titleEn}</li>
            ))}
            {initiatives.length === 0 ? (
              <li className="text-muted">{t("emptyInitiatives")}</li>
            ) : null}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl text-navy">{t("upcomingWorkshops")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {events.map((item) => (
              <li key={item.id}>
                {isAr ? item.titleAr : item.titleEn} ·{" "}
                <span className="numeric">{item.startsAt.toISOString().slice(0, 10)}</span>
              </li>
            ))}
            {events.length === 0 ? (
              <li className="text-muted">{t("emptyEvents")}</li>
            ) : null}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl numeric text-navy">{value}</p>
    </div>
  );
}
