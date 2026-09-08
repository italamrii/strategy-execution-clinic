import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";

export default async function ForbiddenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("errors");
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-4xl text-ink">{t("forbiddenTitle")}</h1>
      <p className="mt-4 text-muted">{t("forbiddenBody")}</p>
      <Link href="/" className="mt-8 inline-block border border-navy px-4 py-2 text-navy">
        {t("homeLink")}
      </Link>
    </main>
  );
}
