import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext, requireAuthenticatedPermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listContentBlocksForAdmin } from "@/modules/content";
import { AdminNav } from "@/shared/ui/admin-nav";
import { ContentAdminForm } from "@/modules/content/ui/content-admin-form";

export const dynamic = "force-dynamic";

export default async function AdminContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminContent");
  const auth = await getOptionalAuthContext();
  if (!auth) return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  try {
    await requireAuthenticatedPermission("content.write");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }
  const blocks = await listContentBlocksForAdmin();
  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <AdminNav active="content" />
      <ContentAdminForm blocks={blocks} />
    </main>
  );
}
