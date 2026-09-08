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
  const block = await getPublishedContentBySlug("contact.info");
  const title = block
    ? locale === "ar"
      ? block.titleAr
      : block.titleEn
    : "Contact";
  return { title };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("publicPages");
  const block = await getPublishedContentBySlug("contact.info");
  const title = block
    ? locale === "ar"
      ? block.titleAr
      : block.titleEn
    : t("contactTitle");
  const body = block
    ? locale === "ar"
      ? block.bodyAr
      : block.bodyEn
    : t("contactFallback");

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl text-ink">{title}</h1>
      <p className="mt-8 text-lg text-graphite">{body}</p>
      <p className="mt-6 text-sm text-muted">{t("contactNote")}</p>
    </main>
  );
}
