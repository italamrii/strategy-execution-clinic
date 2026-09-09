import { getTranslations } from "next-intl/server";

export default async function LocaleLoading() {
  const t = await getTranslations("states");
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-24" aria-busy="true">
      <p className="text-sm tracking-widest text-muted">{t("loadingEyebrow")}</p>
      <h1 className="mt-3 text-3xl text-navy">{t("loadingTitle")}</h1>
      <p className="mt-3 text-muted">{t("loadingBody")}</p>
    </main>
  );
}
