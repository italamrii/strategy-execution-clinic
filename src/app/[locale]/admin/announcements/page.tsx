import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext, requireAuthenticatedPermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listAnnouncementsForAdmin } from "@/modules/admin";
import { AdminNav } from "@/shared/ui/admin-nav";
import { AnnouncementForm } from "@/modules/admin/ui/announcement-form";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminAnnouncements");
  const auth = await getOptionalAuthContext();
  if (!auth) return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  try {
    await requireAuthenticatedPermission("announcement.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }
  const items = await listAnnouncementsForAdmin();
  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <AdminNav active="announcements" />
      <AnnouncementForm />
      <ul className="mt-12 space-y-3">
        {items.map((row) => (
          <li key={row.id} className="border border-line bg-surface p-4 text-sm">
            <p className="text-navy">{locale === "ar" ? row.titleAr : row.titleEn}</p>
            <p className="text-muted">{row.audience} · {row.severity}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
