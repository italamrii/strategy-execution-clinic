import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { VolunteerAdminNav } from "@/modules/volunteering/ui/admin-nav";
import { VolunteerOpportunityAdminForm } from "@/modules/volunteering/ui/opportunity-form";

export const dynamic = "force-dynamic";

export default async function AdminVolunteerOpportunitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminVolunteer");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <AccessDenied status="unauthenticated" />;
  }
  try {
    await requireAuthenticatedPermission("volunteer.opportunity.create");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("opportunitiesTitle")}</h1>
      <VolunteerAdminNav active="opportunities" />
      <section className="mt-10 border border-line bg-surface p-6">
        <h2 className="text-xl text-navy">{t("createOpportunity")}</h2>
        <VolunteerOpportunityAdminForm />
      </section>
    </main>
  );
}
