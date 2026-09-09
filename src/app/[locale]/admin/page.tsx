import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { getAdminDashboardMetrics, getAnalyticsSummary, operationalSearch } from "@/modules/admin";
import { AdminSearchForm } from "@/modules/admin/ui/admin-search-form";
import { AccessDenied } from "@/shared/ui/access-denied";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: localeParam } = await params;
  const { q } = await searchParams;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminDashboard");
  const access = await resolvePageAccess("admin.dashboard.read");
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const [metrics, analytics, search] = await Promise.all([
    getAdminDashboardMetrics(),
    getAnalyticsSummary({ actorUserId: access.auth.userId }).catch(() => null),
    q?.trim() ? operationalSearch({ actorUserId: access.auth.userId, query: q }) : null,
  ]);

  return (
    <main id="main" data-access="granted" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("subtitle")}</p>
      <AdminSearchForm initialQuery={q ?? ""} />
      {search ? (
        <section className="mt-8 border border-line bg-surface p-4 text-sm">
          <h2 className="text-lg text-navy">{t("searchResults")}</h2>
          <p className="mt-2 text-muted">
            {t("membersFound", { count: search.members.length })} ·{" "}
            {t("credentialsFound", { count: search.credentials.length })}
          </p>
          {search.credentials.length === 0 && search.members.length === 0 ? (
            <p className="mt-3 text-muted">{t("searchEmpty")}</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {search.credentials.map((c) => (
                <li key={c.id} className="font-mono">{c.publicCode}</li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("activeMemberships")} value={metrics.members.activeMemberships} />
        <MetricCard label={t("pendingApplications")} value={metrics.members.pendingApplications} />
        <MetricCard label={t("activeVolunteers")} value={metrics.volunteering.activeVolunteers} />
        <MetricCard label={t("openOpportunities")} value={metrics.volunteering.openOpportunities} />
        <MetricCard label={t("pendingVolunteerApplications")} value={metrics.volunteering.pendingApplications} />
        <MetricCard label={t("pendingHourApprovals")} value={metrics.volunteering.pendingHourApprovals} />
        <MetricCard label={t("approvedContributions")} value={metrics.recognition.approvedContributions} />
        <MetricCard label={t("pendingConsultations")} value={metrics.consultations.pending} />
        <MetricCard label={t("scheduledMeetings")} value={metrics.meetings.scheduled} />
        <MetricCard label={t("failedNotifications")} value={metrics.operations.failedNotifications} />
      </div>
      {analytics ? (
        <section className="mt-12">
          <h2 className="text-2xl text-navy">{t("analyticsTitle")}</h2>
          <p className="mt-2 text-sm text-muted">
            {t("contributionApprovals", { count: analytics.contributionApprovals })}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t("membershipGrowthPoints", { count: analytics.membershipGrowth.length })}
          </p>
        </section>
      ) : null}
      <p className="mt-10">
        <Link href="/account" className="text-sm text-navy">{t("backToAccount")}</Link>
      </p>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl text-navy">{value}</p>
    </div>
  );
}
