import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { listFeatureFlagsForAdmin, listSystemSettings } from "@/modules/admin";
import { SettingsForm } from "@/modules/admin/ui/settings-form";
import { FeatureFlagsForm } from "@/modules/admin/ui/feature-flags-form";
import { AccessDenied } from "@/shared/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const access = await resolvePageAccess(["admin.settings.manage", "settings.manage"]);
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const t = await getTranslations("adminSettings");
  const settings = await listSystemSettings();
  const flags = await listFeatureFlagsForAdmin();
  return (
    <main id="main" className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <SettingsForm settings={settings} />
      <section className="mt-12">
        <h2 className="text-2xl text-navy">{t("flagsTitle")}</h2>
        <FeatureFlagsForm flags={flags} />
      </section>
    </main>
  );
}
