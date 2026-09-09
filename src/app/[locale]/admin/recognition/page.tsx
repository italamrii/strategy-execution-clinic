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

export default async function AdminRecognitionPage({
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
    await requireAuthenticatedPermission("badge.read.any");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }
  const badges = await listBadgeDefinitions();

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <p className="mt-3 text-graphite">{t("subtitle")}</p>
      <RecognitionAdminNav active="recognition" />
      <p className="mt-10 text-sm text-muted">{t("badgeCount", { count: badges.length })}</p>
    </main>
  );
}
