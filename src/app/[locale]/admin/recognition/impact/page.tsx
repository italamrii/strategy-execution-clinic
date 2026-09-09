import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listImpactRulesForAdmin } from "@/modules/recognition";
import { RecognitionAdminNav } from "@/modules/recognition/ui/admin-nav";
import { ImpactWeightForm } from "@/modules/recognition/ui/impact-weight-form";

export const dynamic = "force-dynamic";

export default async function AdminImpactPage({
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
    await requireAuthenticatedPermission("impact.config.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }
  const rules = await listImpactRulesForAdmin();

  return (
    <main id="main" className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("impactTitle")}</h1>
      <p className="mt-2 text-muted">{t("impactSubtitle")}</p>
      <RecognitionAdminNav active="impact" />
      <ImpactWeightForm rules={rules} />
    </main>
  );
}
