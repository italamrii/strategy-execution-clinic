import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listMilestoneDefinitionsForAdmin } from "@/modules/recognition";
import { RecognitionAdminNav } from "@/modules/recognition/ui/admin-nav";
import { MilestoneConfigForm } from "@/modules/recognition/ui/milestone-config-form";

export const dynamic = "force-dynamic";

export default async function AdminMilestonesPage({
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
    return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  }
  try {
    await requireAuthenticatedPermission("milestone.config.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }
  const milestones = await listMilestoneDefinitionsForAdmin();

  return (
    <main id="main" className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("milestonesTitle")}</h1>
      <p className="mt-2 text-muted">{t("milestonesSubtitle")}</p>
      <RecognitionAdminNav active="milestones" />
      <MilestoneConfigForm milestones={milestones} />
    </main>
  );
}
