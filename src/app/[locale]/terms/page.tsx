import { setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getPublishedContentBySlug } from "@/modules/content";

export const dynamic = "force-dynamic";

async function legalPage(locale: "ar" | "en", slug: string, fallbackTitle: string) {
  const block = await getPublishedContentBySlug(slug);
  return {
    title: block ? (locale === "ar" ? block.titleAr : block.titleEn) : fallbackTitle,
    body: block ? (locale === "ar" ? block.bodyAr : block.bodyEn) : "",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const page = await legalPage(locale, "legal.terms", "Terms");
  return { title: page.title };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const page = await legalPage(locale, "legal.terms", "Terms of Use");
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl text-ink">{page.title}</h1>
      <div className="prose mt-8 max-w-none text-graphite" dangerouslySetInnerHTML={{ __html: page.body }} />
    </main>
  );
}
