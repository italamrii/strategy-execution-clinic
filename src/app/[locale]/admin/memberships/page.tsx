import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { getMembershipMetrics } from "@/modules/membership";
import { AdminMembershipNav } from "@/modules/membership/ui/admin-nav";

export default async function AdminMembershipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminMembership");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <AccessDenied status="unauthenticated" />;
  }
  try {
    await requireAuthenticatedPermission("membership.read.any");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }

  const metrics = await getMembershipMetrics(auth.userId);

  const cards = [
    ["submitted", metrics.applicationsSubmitted],
    ["underReview", metrics.underReview],
    ["changesRequested", metrics.changesRequested],
    ["approved", metrics.approved],
    ["rejected", metrics.rejected],
    ["activeMemberships", metrics.activeMemberships],
    ["foundingMembers", metrics.foundingMembers],
    ["volunteerMemberships", metrics.volunteerMemberships],
  ] as const;

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <AdminMembershipNav active="dashboard" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([key, value]) => (
          <div key={key} className="border border-line bg-surface p-6">
            <p className="text-sm text-muted">{t(key)}</p>
            <p className="numeric mt-3 text-3xl text-navy">{value}</p>
          </div>
        ))}
      </div>
      <section className="mt-12">
        <h2 className="text-2xl text-ink">{t("typeDistribution")}</h2>
        <ul className="mt-6 space-y-3">
          {metrics.typeDistribution.map((item) => (
            <li
              key={item.slug}
              className="flex items-center justify-between border border-line bg-surface px-5 py-4 text-sm"
            >
              <span className="text-ink">
                {locale === "ar" ? item.nameAr : item.nameEn}
              </span>
              <span className="numeric text-navy">{item.activeCount}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
