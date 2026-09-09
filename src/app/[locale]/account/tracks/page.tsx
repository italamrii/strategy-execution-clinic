import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { getMemberTrackDashboard } from "@/modules/tracks";

export const dynamic = "force-dynamic";

export default async function AccountTracksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const auth = await getOptionalAuthContext();
  if (!auth) redirect({ href: "/login", locale });
  const t = await getTranslations("tracks");
  const accountT = await getTranslations("account");
  const data = await getMemberTrackDashboard(auth!.userId);
  const isAr = locale === "ar";
  const trackById = new Map(data.tracks.map((track) => [track.id, track]));

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("myTracks")}</h1>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/account" className="text-graphite hover:text-navy">
          {accountT("overview")}
        </Link>
        <Link href="/account/tracks" className="border-b border-gold text-navy">
          {t("myTracks")}
        </Link>
        <Link href="/tracks" className="text-graphite hover:text-navy">
          {t("directoryTitle")}
        </Link>
      </nav>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {data.memberships.map((membership) => {
          const track = trackById.get(membership.trackId);
          if (!track) return null;
          const canManage = data.leadership.some((row) => row.trackId === track.id);
          return (
            <article key={membership.id} className="border border-line bg-surface p-6">
              <p className="numeric text-sm text-muted">{track.code}</p>
              <h2 className="mt-2 text-2xl text-navy">
                {isAr ? track.nameAr : track.nameEn}
              </h2>
              <p className="mt-2 text-sm text-graphite">
                {membership.role}
                {membership.isPrimary ? ` · ${t("primaryBadge")}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <Link href={`/account/tracks/${track.slug}`} className="text-navy underline">
                  {t("openWorkspace")}
                </Link>
                {canManage ? (
                  <Link
                    href={`/account/tracks/${track.slug}/manage`}
                    className="text-navy underline"
                  >
                    {t("manage")}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
      {data.memberships.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          {t("noMemberships")}{" "}
          <Link href="/tracks" className="text-navy underline">
            {t("directoryTitle")}
          </Link>
        </p>
      ) : null}

      <section className="mt-12">
        <h2 className="text-2xl text-navy">{t("myContributions")}</h2>
        <ul className="mt-4 divide-y divide-line border border-line bg-surface">
          {data.contributions.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
              <span>{isAr ? item.titleAr : item.titleEn}</span>
              <span className="text-muted">{item.status}</span>
            </li>
          ))}
          {data.contributions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">{t("emptyContributions")}</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
