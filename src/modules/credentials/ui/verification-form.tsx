"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { isValidPublicCodeFormat } from "../public-code";

export function VerificationForm() {
  const t = useTranslations("verify");
  const router = useRouter();
  const [invalid, setInvalid] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("publicCode") ?? "")
      .trim().toUpperCase();
    if (!isValidPublicCodeFormat(code)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    router.push(`/verify/${encodeURIComponent(code)}`);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label htmlFor="public-code" className="block text-sm font-medium text-ink">
        {t("codeLabel")}
      </label>
      <p id="code-help" className="text-sm text-muted">{t("codeHelp")}</p>
      <input
        id="public-code"
        name="publicCode"
        type="text"
        dir="ltr"
        required
        maxLength={24}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid}
        aria-describedby={invalid ? "code-help code-error" : "code-help"}
        onChange={() => setInvalid(false)}
        className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />
      {invalid && <p id="code-error" role="alert" className="text-sm text-ink">{t("invalidCode")}</p>}
      <button type="submit" className="rounded-lg bg-ink px-6 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        {t("submit")}
      </button>
    </form>
  );
}
