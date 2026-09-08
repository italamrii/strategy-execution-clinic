import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listHourEntriesForAdmin } from "@/modules/volunteering";
import { VolunteerAdminNav } from "@/modules/volunteering/ui/admin-nav";
import { VolunteerHourReviewActions } from "@/modules/volunteering/ui/hour-review-actions";

export const dynamic = "force-dynamic";

export default async function AdminVolunteerHoursPage({
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
    return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  }
  try {
    await requireAuthenticatedPermission("volunteer.hours.read.any");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }
  const pending = await listHourEntriesForAdmin({
    actorUserId: auth.userId,
    status: "pending",
    page: 1,
    pageSize: 30,
  });
  const approved = await listHourEntriesForAdmin({
    actorUserId: auth.userId,
    status: "approved",
    page: 1,
    pageSize: 30,
  });
  const items = [...pending.items, ...approved.items];

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("hoursTitle")}</h1>
      <VolunteerAdminNav active="hours" />
      <ul className="mt-10 space-y-4">
        {items.map((entry) => (
          <li key={entry.id} className="border border-line bg-surface p-4">
            <p className="text-navy">
              {entry.hours}h · {entry.status} · {entry.activityDate ?? "—"}
            </p>
            <p className="mt-1 text-sm text-graphite">{entry.description}</p>
            <VolunteerHourReviewActions entryId={entry.id} status={entry.status} />
          </li>
        ))}
      </ul>
    </main>
  );
}
