import { getTranslations } from "next-intl/server";
import { getContentBySlug } from "@/modules/content";
import { PolicyConsentForm } from "./policy-consent-form";

export async function CmsArticle({
  slug,
  locale,
  signedIn,
}: {
  slug: string;
  locale: "ar" | "en";
  signedIn?: boolean;
}) {
  const t = await getTranslations("policies");
  const block = await getContentBySlug(slug);
  const title = block ? (locale === "ar" ? block.titleAr : block.titleEn) : t("missingTitle");
  const unpublished = !block || block.status !== "published";
  const body = unpublished
    ? null
    : locale === "ar"
      ? block.bodyAr
      : block.bodyEn;
  const version = block?.updatedAt?.toISOString() ?? "draft";

  return (
    <article className="page-prose">
      <p className="eyebrow">SEC · POLICY</p>
      <h1>{title}</h1>
      {unpublished ? (
        <p>{t("underReview")}</p>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: body ?? "" }} />
      )}
      {signedIn && !unpublished ? (
        <PolicyConsentForm slug={slug} version={version} />
      ) : null}
    </article>
  );
}
