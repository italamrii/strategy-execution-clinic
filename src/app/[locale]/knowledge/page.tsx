import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getPublishedContentBySlug } from "@/modules/content";
import { listPublicOperatingTracks } from "@/modules/tracks";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations("journey");
  const isAr = locale === "ar";
  const [block, tracks] = await Promise.all([
    getPublishedContentBySlug("knowledge.hub"),
    listPublicOperatingTracks(),
  ]);
  return (
    <main id="main" className="page-prose">
      <p className="eyebrow">SEC · KNOWLEDGE</p>
      <h1>{block ? (isAr ? block.titleAr : block.titleEn) : t("knowledgeTitle")}</h1>
      <div
        dangerouslySetInnerHTML={{
          __html: block ? (isAr ? block.bodyAr : block.bodyEn) : t("knowledgeFallback"),
        }}
      />
      <h2>{t("trackResources")}</h2>
      {tracks.length === 0 ? (
        <p>{t("knowledgeEmpty")}</p>
      ) : (
        <ul>
          {tracks.map((track) => (
            <li key={track.id}>
              <Link href={`/tracks/${track.slug}`}>{isAr ? track.nameAr : track.nameEn}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
