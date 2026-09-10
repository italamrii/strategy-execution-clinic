import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getPublishedContentBySlug } from "@/modules/content";

export const dynamic = "force-dynamic";

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations("journey");
  const block = await getPublishedContentBySlug("how.it-works");
  const title = block ? (locale === "ar" ? block.titleAr : block.titleEn) : t("howTitle");
  const body = block ? (locale === "ar" ? block.bodyAr : block.bodyEn) : t("howFallback");
  return (
    <main id="main" className="page-prose">
      <p className="eyebrow">SEC · JOURNEY</p>
      <h1>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </main>
  );
}
