import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { AccessDenied } from "@/shared/ui/access-denied";

export default async function AdminProbePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const access = await resolvePageAccess("admin.dashboard.read");
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const t = await getTranslations("adminDashboard");
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-2xl text-ink">{t("probeOk")}</h1>
      <p className="mt-3 text-graphite">{t("probeGranted")}</p>
    </main>
  );
}
