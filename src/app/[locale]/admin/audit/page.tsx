import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext, requireAuthenticatedPermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listAuditLogsForAdmin } from "@/modules/admin";
import { AdminNav } from "@/shared/ui/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminAudit");
  const auth = await getOptionalAuthContext();
  if (!auth) return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  try {
    await requireAuthenticatedPermission("audit.read");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }
  const logs = await listAuditLogsForAdmin({ actorUserId: auth.userId });
  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <AdminNav active="audit" />
      <ul className="mt-10 space-y-3">
        {logs.items.map((row) => (
          <li key={row.id} className="border border-line bg-surface p-4 text-sm">
            <p className="font-mono text-navy">{row.action}</p>
            <p className="text-muted">{row.resourceType} · {row.resourceId}</p>
            <p className="text-muted">{row.createdAt?.toISOString()}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
