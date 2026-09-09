import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import { getOptionalAuthContext, requireAuthenticatedPermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listSecurityEventsForAdmin } from "@/modules/admin";

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
  if (!auth) return <AccessDenied status="unauthenticated" />;
  try {
    await requireAuthenticatedPermission("security.events.read");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }
  const events = await listSecurityEventsForAdmin({ actorUserId: auth.userId });
  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      
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
