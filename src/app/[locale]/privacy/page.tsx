import { setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { CmsArticle } from "@/shared/ui/cms-article";

export const dynamic = "force-dynamic";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const auth = await getOptionalAuthContext();
  return (
    <main id="main">
      <CmsArticle slug="legal.privacy" locale={locale} signedIn={Boolean(auth)} />
    </main>
  );
}
