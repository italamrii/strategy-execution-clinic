import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import {
  getMemberTrackDashboard,
  getTrackBySlug,
  TrackError,
} from "@/modules/tracks";
import { TrackContributionForm } from "@/modules/tracks/ui/track-contribution-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountTrackDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const auth = await getOptionalAuthContext();
  if (!auth) redirect({ href: "/login", locale });
  const t = await getTranslations("tracks");
  let track;
  try {
    track = await getTrackBySlug(slug);
  } catch (error) {
    if (error instanceof TrackError) notFound();
    throw error;
  }
  const data = await getMemberTrackDashboard(auth!.userId);
  const membership = data.memberships.find((row) => row.trackId === track.id);
  if (!membership) {
    redirect({ href: `/tracks/${slug}`, locale });
  }
  const activeMembership = membership!;
  const isAr = locale === "ar";
  const contributions = data.contributions.filter((row) => row.trackId === track.id);
  const tasks = data.tasks.filter((row) => row.trackId === track.id);
  const canManage = data.leadership.some((row) => row.trackId === track.id);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/account/tracks" className="text-sm text-graphite hover:text-navy">
        {t("myTracks")}
      </Link>
      <h1 className="mt-4 text-4xl text-ink">{isAr ? track.nameAr : track.nameEn}</h1>
      <p className="mt-2 text-sm text-muted">
        {activeMembership.role}
        {activeMembership.isPrimary ? ` · ${t("primaryBadge")}` : ""}
      </p>
      {canManage ? (
        <Link
          href={`/account/tracks/${track.slug}/manage`}
          className="mt-4 inline-block text-sm text-navy underline"
        >
          {t("manage")}
        </Link>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <TrackContributionForm trackId={track.id} />
        <section>
          <h2 className="text-xl text-navy">{t("assignedTasks")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {tasks.map((task) => (
              <li key={task.id}>{isAr ? task.titleAr : task.titleEn}</li>
            ))}
            {tasks.length === 0 ? (
              <li className="text-muted">{t("emptyTasks")}</li>
            ) : null}
          </ul>
          <h2 className="mt-8 text-xl text-navy">{t("myContributions")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {contributions.map((item) => (
              <li key={item.id}>
                {isAr ? item.titleAr : item.titleEn} · {item.status}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
