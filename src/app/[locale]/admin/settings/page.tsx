import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext, requireAuthenticatedPermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listFeatureFlagsForAdmin, listSystemSettings } from "@/modules/admin";
import { AdminNav } from "@/shared/ui/admin-nav";
import { SettingsForm } from "@/modules/admin/ui/settings-form";
import { FeatureFlagsForm } from "@/modules/admin/ui/feature-flags-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminSettings");
  const auth = await getOptionalAuthContext();
  if (!auth) return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  try {
    await requireAuthenticatedPermission("settings.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }
  const settings = await listSystemSettings();
  const flags = await listFeatureFlagsForAdmin();
  return (
    <main id="main" className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <AdminNav active="settings" />
      <SettingsForm settings={settings} />
      <section className="mt-12">
        <h2 className="text-2xl text-navy">{t("flagsTitle")}</h2>
        <FeatureFlagsForm flags={flags} />
      </section>
    </main>
  );
}
