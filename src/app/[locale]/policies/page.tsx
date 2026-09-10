import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { listPublishedPolicyPages } from "@/modules/content";

export const dynamic = "force-dynamic";

const HREF: Record<string, string> = {
  "legal.privacy": "/privacy",
  "legal.terms": "/terms",
  "legal.membership": "/policies/membership",
  "legal.conduct": "/policies/conduct",
  "legal.consultations": "/policies/consultations",
  "legal.meetings": "/policies/meetings",
  "legal.content": "/policies/content",
};

export default async function PoliciesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations("policies");
  const rows = await listPublishedPolicyPages();
  return (
    <main id="main" className="page-prose">
      <p className="eyebrow">SEC · POLICIES</p>
      <h1>{t("indexTitle")}</h1>
      <p>{t("indexBody")}</p>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={HREF[row.slug] ?? "/policies"}>
              {locale === "ar" ? row.titleAr : row.titleEn}
            </Link>
            {row.status !== "published" ? ` — ${t("draftBadge")}` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
