import { getTranslations } from "next-intl/server";

export default async function AccountLoading() {
  const t = await getTranslations("states");
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16" aria-busy="true">
      <h1 className="text-3xl text-navy">{t("loadingTitle")}</h1>
      <p className="mt-3 text-muted">{t("loadingBody")}</p>
    </main>
  );
}
