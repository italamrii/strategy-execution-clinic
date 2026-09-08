import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext, requireAuthenticatedPermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listSecurityEventsForAdmin } from "@/modules/admin";
import { AdminNav } from "@/shared/ui/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminSecurity");
  const auth = await getOptionalAuthContext();
  if (!auth) return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  try {
    await requireAuthenticatedPermission("security.events.read");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }
  const events = await listSecurityEventsForAdmin({ actorUserId: auth.userId });
  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <AdminNav active="security" />
      <ul className="mt-10 space-y-3">
        {events.items.map((row) => (
          <li key={row.id} className="border border-line bg-surface p-4 text-sm">
            <p className="font-mono text-navy">{row.kind}</p>
            <p className="text-muted">{row.createdAt?.toISOString()}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
