import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { listAuditLogsForAdmin } from "@/modules/admin";
import { AccessDenied } from "@/shared/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const access = await resolvePageAccess("audit.read");
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const t = await getTranslations("adminAudit");
  const logs = await listAuditLogsForAdmin({ actorUserId: access.auth.userId });
  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      {logs.items.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-stone p-6 text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-10 space-y-3">
          {logs.items.map((row) => (
            <li key={row.id} className="border border-line bg-surface p-4 text-sm">
              <p className="font-mono text-navy">{row.action}</p>
              <p className="text-muted">{row.resourceType} · {row.resourceId}</p>
              <p className="text-muted">{row.createdAt?.toISOString()}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
