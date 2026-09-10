import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { getPublishedContentBySlug } from "@/modules/content";
import { SupportForm } from "@/modules/support/ui/support-form";

export const dynamic = "force-dynamic";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations("support");
  const auth = await getOptionalAuthContext();
  const block = await getPublishedContentBySlug("contact.info");
  const title = block ? (locale === "ar" ? block.titleAr : block.titleEn) : t("title");
  const body = block ? (locale === "ar" ? block.bodyAr : block.bodyEn) : t("intro");
  return (
    <main id="main" className="page-prose">
      <p className="eyebrow">SEC · SUPPORT</p>
      <h1>{title}</h1>
      <p>{body}</p>
      <SupportForm locale={locale} defaultEmail={auth?.email} />
    </main>
  );
}
