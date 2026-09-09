"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/ui/button";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("states");
  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-16">
      <section className="rounded-2xl border border-line bg-surface p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold tracking-widest text-muted">500</p>
        <h1 className="mt-4 text-3xl text-navy">{t("errorTitle")}</h1>
        <p className="mt-4 leading-8 text-muted">{t("errorBody")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>
            {t("retry")}
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center border border-navy px-6 py-3 text-sm text-navy"
          >
            {t("home")}
          </Link>
        </div>
      </section>
    </main>
  );
}
