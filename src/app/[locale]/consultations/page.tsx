import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getPublishedContentBySlug } from "@/modules/content";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function PublicConsultationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations("journey");
  const block = await getPublishedContentBySlug("consultations.public");
  const title = block ? (locale === "ar" ? block.titleAr : block.titleEn) : t("consultationsTitle");
  const body = block ? (locale === "ar" ? block.bodyAr : block.bodyEn) : t("consultationsFallback");
  return (
    <main id="main" className="page-prose">
      <p className="eyebrow">SEC · ADVISORY</p>
      <h1>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <p className="mt-8">
        <Link className="institutional-button institutional-button--primary" href="/account/consultations">
          {t("openConsultations")}
        </Link>
      </p>
    </main>
  );
}
