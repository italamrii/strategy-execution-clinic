import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { listSupportRequestsForAdmin } from "@/modules/support";
import { AccessDenied } from "@/shared/ui/access-denied";
import { AdminSupportActions } from "@/modules/support/ui/admin-support-actions";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const access = await resolvePageAccess("support.request.read.any");
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const t = await getTranslations("support");
  const rows = await listSupportRequestsForAdmin(access.auth.userId);
  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-4xl text-ink">{t("adminTitle")}</h1>
      <p className="mt-3 text-graphite">{t("adminNote")}</p>
      <div className="mt-8 grid gap-4">
        {rows.length === 0 ? <p className="border border-line bg-surface p-6">{t("adminEmpty")}</p> : null}
        {rows.map((row) => (
          <article key={row.id} className="border border-line bg-surface p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <strong>{row.subject}</strong>
              <span>{t(`status.${row.status}` as "status.open")}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{t(`categories.${row.category}` as "categories.general")}</p>
            <p className="mt-3 text-graphite">{row.message}</p>
            <p className="mt-3 text-sm text-muted">{row.replyEmail}</p>
            <AdminSupportActions requestId={row.id} status={row.status} />
          </article>
        ))}
      </div>
    </main>
  );
}
