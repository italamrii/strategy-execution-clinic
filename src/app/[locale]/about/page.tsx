import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getPublishedContentBySlug } from "@/modules/content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const block = await getPublishedContentBySlug("about.clinic");
  const title = block
    ? locale === "ar"
      ? block.titleAr
      : block.titleEn
    : locale === "ar"
      ? "عن العيادة"
      : "About";
  return { title };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("publicPages");
  const block = await getPublishedContentBySlug("about.clinic");
  const title = block
    ? locale === "ar"
      ? block.titleAr
      : block.titleEn
    : t("aboutTitle");
  const body = block
    ? locale === "ar"
      ? block.bodyAr
      : block.bodyEn
    : t("aboutFallback");

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl text-ink">{title}</h1>
      <div
        className="prose mt-8 max-w-none text-graphite"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </main>
  );
}
