"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { updateLocaleAction } from "@/modules/identity/actions";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("a11y");
  const [pending, startTransition] = useTransition();

  function switchTo(next: "ar" | "en") {
    startTransition(async () => {
      try {
        await updateLocaleAction(next);
      } catch {
        // Unauthenticated users skip persistence.
      }
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      className="flex items-center gap-2 text-sm"
      role="group"
      aria-label={t("language")}
    >
      <button
        type="button"
        disabled={pending}
        className={`min-h-10 px-2 ${locale === "ar" ? "text-navy border-b border-gold" : "text-graphite"}`}
        aria-pressed={locale === "ar"}
        onClick={() => switchTo("ar")}
      >
        العربية
      </button>
      <span className="text-line-strong" aria-hidden>
        |
      </span>
      <button
        type="button"
        disabled={pending}
        className={`min-h-10 px-2 font-[family-name:var(--font-latin)] ${locale === "en" ? "text-navy border-b border-gold" : "text-graphite"}`}
        aria-pressed={locale === "en"}
        onClick={() => switchTo("en")}
      >
        English
      </button>
    </div>
  );
}
