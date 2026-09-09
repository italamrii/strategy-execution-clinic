import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listBadgeDefinitions } from "@/modules/recognition";
import { RecognitionAdminNav } from "@/modules/recognition/ui/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminRecognition");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <AccessDenied status="unauthenticated" />;
  }
  try {
    await requireAuthenticatedPermission("badge.definition.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }
  const badges = await listBadgeDefinitions();

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("badgesTitle")}</h1>
      <RecognitionAdminNav active="badges" />
      <ul className="mt-10 space-y-3">
        {badges.map((b) => (
          <li key={b.id} className="border border-line bg-surface p-4">
            <h2 className="text-lg text-navy">
              {locale === "ar" ? b.nameAr : b.nameEn}
            </h2>
            <p className="text-sm text-muted">
              {b.slug} · {b.issuanceMode}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
