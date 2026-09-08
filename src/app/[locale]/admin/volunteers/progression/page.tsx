import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { PROGRESSION_RULE_SEEDS } from "@/modules/volunteering/catalog";
import { VolunteerAdminNav } from "@/modules/volunteering/ui/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminVolunteerProgressionPage({
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
    await requireAuthenticatedPermission("volunteer.progression.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("progressionTitle")}</h1>
      <VolunteerAdminNav active="progression" />
      <ul className="mt-10 space-y-4">
        {PROGRESSION_RULE_SEEDS.map((rule) => (
          <li key={rule.slug} className="border border-line bg-surface p-4">
            <h2 className="text-lg text-navy">
              {locale === "ar" ? rule.nameAr : rule.nameEn}
            </h2>
            <pre className="mt-2 overflow-x-auto text-xs text-muted">
              {JSON.stringify(rule.predicate, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </main>
  );
}
