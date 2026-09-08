import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-4xl text-ink">{t("notFoundTitle")}</h1>
      <p className="mt-4 text-muted">{t("notFoundBody")}</p>
      <Link href="/" className="mt-8 inline-block border border-navy px-4 py-2 text-navy">
        {t("homeLink")}
      </Link>
    </main>
  );
}
