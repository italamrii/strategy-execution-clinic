import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { listOwnApplications, listOwnMemberships } from "@/modules/membership";

function statusKey(
  status: string,
):
  | "statusDraft"
  | "statusSubmitted"
  | "statusUnderReview"
  | "statusChangesRequested"
  | "statusApproved"
  | "statusRejected"
  | "statusWithdrawn"
  | "statusActive"
  | "statusSuspended"
  | "statusExpired"
  | "statusRevoked"
  | "status" {
  const map: Record<
    string,
    | "statusDraft"
    | "statusSubmitted"
    | "statusUnderReview"
    | "statusChangesRequested"
    | "statusApproved"
    | "statusRejected"
    | "statusWithdrawn"
    | "statusActive"
    | "statusSuspended"
    | "statusExpired"
    | "statusRevoked"
  > = {
    draft: "statusDraft",
    submitted: "statusSubmitted",
    under_review: "statusUnderReview",
    changes_requested: "statusChangesRequested",
    approved: "statusApproved",
    rejected: "statusRejected",
    withdrawn: "statusWithdrawn",
    active: "statusActive",
    suspended: "statusSuspended",
    expired: "statusExpired",
    revoked: "statusRevoked",
  };
  return map[status] ?? "status";
}

export default async function AccountMembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const auth = await getOptionalAuthContext();
  if (!auth) {
    redirect({ href: "/login", locale });
  }
  const t = await getTranslations("membership");
  const accountT = await getTranslations("account");
  const [memberships, applications] = await Promise.all([
    listOwnMemberships(auth!.userId),
    listOwnApplications(auth!.userId),
  ]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("accountTitle")}</h1>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/account" className="text-graphite hover:text-navy">
          {accountT("overview")}
        </Link>
        <Link href="/account/membership" className="border-b border-gold text-navy">
          {accountT("membership")}
        </Link>
        <Link href="/account/profile" className="text-graphite hover:text-navy">
          {accountT("profile")}
        </Link>
        <Link href="/account/security" className="text-graphite hover:text-navy">
          {accountT("security")}
        </Link>
      </nav>

      <section className="mt-12">
        {memberships.length === 0 ? (
          <p className="text-graphite">{t("accountEmpty")}</p>
        ) : (
          <ul className="space-y-6">
            {memberships.map((membership) => (
              <li key={membership.id} className="border border-line bg-surface p-8">
                {membership.status === "active" ? (
                  <p className="text-sm tracking-[0.12em] text-gold-deep">
                    {t("activeMembership")}
                  </p>
                ) : null}
                <h2 className="mt-3 text-2xl text-ink">
                  {locale === "ar"
                    ? membership.membershipType.nameAr
                    : membership.membershipType.nameEn}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {locale === "ar"
                    ? membership.membershipType.nameEn
                    : membership.membershipType.nameAr}
                </p>
                <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">{t("status")}</dt>
                    <dd className="text-ink">{t(statusKey(membership.status))}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("issuedAt")}</dt>
                    <dd className="numeric text-ink">
                      {new Date(membership.issuedAt).toLocaleDateString(locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("expiresAt")}</dt>
                    <dd className="numeric text-ink">
                      {membership.endsAt
                        ? new Date(membership.endsAt).toLocaleDateString(locale)
                        : t("noExpiry")}
                    </dd>
                  </div>
                </dl>
                {membership.tracks.length > 0 ? (
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {membership.tracks.map((track) => (
                      <li key={track.id} className="border border-line px-3 py-1 text-sm text-ink">
                        {locale === "ar" ? track.nameAr : track.nameEn}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl text-ink">{t("applicationsTitle")}</h2>
        {applications.length === 0 ? (
          <p className="mt-4 text-graphite">{t("noApplications")}</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {applications.map((app) => (
              <li key={app.id} className="border border-line bg-surface p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-lg text-ink">
                    {locale === "ar" ? app.membershipType.nameAr : app.membershipType.nameEn}
                  </h3>
                  <span className="text-sm text-gold-deep">{t(statusKey(app.status))}</span>
                </div>
                {app.timeline.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-sm text-muted">{t("timeline")}</p>
                    <ol className="mt-2 space-y-1 text-sm text-graphite">
                      {app.timeline.map((event, index) => (
                        <li key={`${app.id}-${index}`}>
                          {event.fromStatus} → {event.toStatus}
                          {event.reason ? ` — ${event.reason}` : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/membership/apply"
          className="mt-8 inline-flex min-h-11 items-center bg-navy px-5 text-sm text-surface"
        >
          {t("ctaApply")}
        </Link>
      </section>
    </main>
  );
}
