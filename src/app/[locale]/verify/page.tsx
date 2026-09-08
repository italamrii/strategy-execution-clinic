import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { VerificationForm } from "@/modules/credentials/ui/verification-form";

export default async function VerifyIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("verify");
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-3xl text-ink">{t("title")}</h1>
      <p className="mt-4 text-graphite">{t("description")}</p>
      <VerificationForm />
    </main>
  );
}
