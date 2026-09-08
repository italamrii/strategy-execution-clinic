import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listVolunteersForAdmin } from "@/modules/volunteering";
import { VolunteerAdminNav } from "@/modules/volunteering/ui/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminVolunteersPage({
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
    return (
      <main className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="text-2xl text-ink">{t("unauthorized")}</h1>
      </main>
    );
  }
  try {
    await requireAuthenticatedPermission("volunteer.profile.read.any");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <main className="mx-auto max-w-6xl px-6 py-24">
          <h1 className="text-2xl text-ink">{t("forbidden")}</h1>
        </main>
      );
    }
    throw error;
  }

  const { items } = await listVolunteersForAdmin({
    actorUserId: auth.userId,
    page: 1,
    pageSize: 30,
  });

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <VolunteerAdminNav active="volunteers" />
      <table className="mt-10 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-start text-muted">
            <th className="py-2">{t("status")}</th>
            <th className="py-2">{t("level")}</th>
            <th className="py-2">{t("approvedHours")}</th>
            <th className="py-2">{t("impact")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v.id} className="border-b border-line">
              <td className="py-3">{v.status}</td>
              <td className="py-3">{v.progressionLevel}</td>
              <td className="py-3">{v.approvedHoursCache}</td>
              <td className="py-3">{v.impactScoreCache}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? <p className="mt-8 text-muted">{t("empty")}</p> : null}
    </main>
  );
}
