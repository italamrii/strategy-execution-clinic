import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import {
  getAdminDashboardMetrics,
  getAnalyticsSummary,
  operationalSearch,
} from "@/modules/admin";
import { AdminNav } from "@/shared/ui/admin-nav";
import { AdminSearchForm } from "@/modules/admin/ui/admin-search-form";
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
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  }
  try {
    await requireAuthenticatedPermission("admin.dashboard.read");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <main id="main" className="mx-auto max-w-2xl px-6 py-16" data-access="denied">
          <section className="rounded-2xl border border-line bg-surface p-8 shadow-sm sm:p-12">
            <p className="text-sm font-semibold tracking-widest text-muted">403</p>
            <h1 className="mt-4 text-3xl text-navy">{t("forbidden")}</h1>
            <p className="mt-4 leading-8 text-muted">{t("accessExplanation")}</p>
            <p className="mt-4 break-words rounded-lg bg-gold/10 p-4 text-sm text-ink" dir="ltr">{auth.email}</p>
            <Link href="/account" className="mt-8 inline-flex rounded-xl bg-navy px-6 py-3 text-white">{t("backToAccount")}</Link>
          </section>
        </main>
      );
    }
    throw error;
  }
  const [metrics, analytics, search] = await Promise.all([
    getAdminDashboardMetrics(),
    getAnalyticsSummary({ actorUserId: auth.userId }).catch(() => null),
    q?.trim() ? operationalSearch({ actorUserId: auth.userId, query: q }) : null,
  ]);

  return (
    <main id="main" data-access="granted" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("subtitle")}</p>
      <AdminNav active="overview" />
      <AdminSearchForm initialQuery={q ?? ""} />
      {search ? (
        <section className="mt-8 border border-line bg-surface p-4 text-sm">
          <h2 className="text-lg text-navy">{t("searchResults")}</h2>
          <p className="mt-2 text-muted">
            {t("membersFound", { count: search.members.length })} ·{" "}
            {t("credentialsFound", { count: search.credentials.length })}
          </p>
          <ul className="mt-3 space-y-1">
            {search.credentials.map((c) => (
              <li key={c.id} className="font-mono">{c.publicCode}</li>
            ))}
          </ul>
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
