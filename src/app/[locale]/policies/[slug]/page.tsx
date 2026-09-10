import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { CmsArticle } from "@/shared/ui/cms-article";

export const dynamic = "force-dynamic";

const SLUGS: Record<string, string> = {
  membership: "legal.membership",
  conduct: "legal.conduct",
  consultations: "legal.consultations",
  meetings: "legal.meetings",
  content: "legal.content",
};

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const contentSlug = SLUGS[slug];
  if (!contentSlug) notFound();
  const auth = await getOptionalAuthContext();
  return (
    <main id="main">
      <CmsArticle slug={contentSlug} locale={locale} signedIn={Boolean(auth)} />
    </main>
  );
}
