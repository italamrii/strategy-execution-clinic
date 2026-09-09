import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { getLeaderWorkspace, TrackError } from "@/modules/tracks";
import {
  TrackApplicationReviewActions,
  TrackContributionReviewActions,
} from "@/modules/tracks/ui/track-review-actions";
import { AccessDenied } from "@/shared/ui/access-denied";
import { AuthorizationError } from "@/shared/security/authorization";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TrackManagePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const auth = await getOptionalAuthContext();
  if (!auth) {
    redirect({ href: "/login", locale });
  }
  const actor = auth!;
  const t = await getTranslations("tracks");
  let workspace;
  try {
    workspace = await getLeaderWorkspace({
      actorUserId: actor.userId,
      slug,
    });
  } catch (error) {
    if (error instanceof TrackError) notFound();
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={actor.email} />;
    }
    throw error;
  }
  const isAr = locale === "ar";
  const { track, applications, roster, queue, analytics } = workspace;

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <Link href={`/account/tracks/${track.slug}`} className="text-sm text-graphite">
        {t("openWorkspace")}
      </Link>
      <h1 className="mt-4 text-4xl text-ink">
        {t("manage")} · {isAr ? track.nameAr : track.nameEn}
      </h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Object.entries(analytics).map(([key, value]) => (
          <div key={key} className="border border-line bg-surface p-4">
            <p className="text-xs text-muted">{t(`analytics.${key}` as "analytics.members")}</p>
            <p className="mt-2 text-2xl numeric">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl text-navy">{t("applications")}</h2>
        <ul className="mt-4 divide-y divide-line border border-line bg-surface">
          {applications.map((application) => (
            <li key={application.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-mono text-xs">{application.userId}</p>
                <p className="text-muted">
                  {application.requestedRole}
                  {application.wantPrimary ? ` · ${t("wantPrimary")}` : ""}
                </p>
              </div>
              <TrackApplicationReviewActions applicationId={application.id} />
            </li>
          ))}
          {applications.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">{t("emptyApplications")}</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl text-navy">{t("reviewQueue")}</h2>
        <ul className="mt-4 divide-y divide-line border border-line bg-surface">
          {queue.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p>{isAr ? item.titleAr : item.titleEn}</p>
                <p className="text-muted">{item.status}</p>
              </div>
              <TrackContributionReviewActions contributionId={item.id} />
            </li>
          ))}
          {queue.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">{t("emptyQueue")}</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl text-navy">{t("roster")}</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {roster.map((member) => (
            <li key={member.id}>
              <span className="font-mono text-xs">{member.userId}</span> · {member.role}
              {member.isPrimary ? ` · ${t("primaryBadge")}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
