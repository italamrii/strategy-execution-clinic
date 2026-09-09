import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import { getOptionalAuthContext, requireAuthenticatedPermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listContentBlocksForAdmin } from "@/modules/content";
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
  if (!auth) return <AccessDenied status="unauthenticated" />;
  try {
    await requireAuthenticatedPermission("content.write");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }
  const blocks = await listContentBlocksForAdmin();
  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      
      <ContentAdminForm blocks={blocks} />
    </main>
  );
}
