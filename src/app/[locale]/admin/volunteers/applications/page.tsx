import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listApplicationsForAdmin } from "@/modules/volunteering";
import { VolunteerAdminNav } from "@/modules/volunteering/ui/admin-nav";
import { VolunteerReviewActions } from "@/modules/volunteering/ui/review-actions";

export const dynamic = "force-dynamic";

export default async function AdminVolunteerApplicationsPage({
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
    await requireAuthenticatedPermission("volunteer.application.read.any");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }
  const { items } = await listApplicationsForAdmin({
    actorUserId: auth.userId,
    page: 1,
    pageSize: 30,
  });

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("applicationsTitle")}</h1>
      <VolunteerAdminNav active="applications" />
      <ul className="mt-10 space-y-4">
        {items.map((app) => (
          <li key={app.id} className="border border-line bg-surface p-4">
            <p className="text-sm text-muted">{app.status}</p>
            <p className="mt-1 text-ink">{app.motivation?.slice(0, 120)}</p>
            {app.status === "submitted" || app.status === "under_review" ? (
              <VolunteerReviewActions applicationId={app.id} />
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
