"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createSupportRequestAction } from "../actions";
import { SUPPORT_CATEGORIES } from "../catalog";

export function SupportForm({ locale, defaultEmail }: { locale: "ar" | "en"; defaultEmail?: string }) {
  const t = useTranslations("support");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="mt-8 border border-line bg-surface p-6 text-ink" role="status">
        {t("submitted")}
      </p>
    );
  }

  return (
    <form
      className="mt-8 grid max-w-2xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        start(async () => {
          const result = await createSupportRequestAction({
            category: String(data.get("category") || ""),
            subject: String(data.get("subject") || ""),
            message: String(data.get("message") || ""),
            replyEmail: String(data.get("replyEmail") || ""),
            locale,
            website: String(data.get("website") || ""),
          });
          if (result.ok) setDone(true);
          else {
            const known = ["invalid_input", "rate_limited", "not_found"] as const;
            const code = known.includes(result.code as (typeof known)[number])
              ? (result.code as (typeof known)[number])
              : "generic";
            setError(t(`errors.${code}`));
          }
        });
      }}
    >
      <label className="grid gap-2 text-sm">
        <span className="text-muted">{t("category")}</span>
        <select name="category" required className="border border-line bg-surface p-3 text-ink">
          {SUPPORT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categories.${category}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm">
        <span className="text-muted">{t("subject")}</span>
        <input name="subject" required minLength={4} className="border border-line bg-surface p-3 text-ink" />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="text-muted">{t("message")}</span>
        <textarea name="message" required minLength={20} rows={6} className="border border-line bg-surface p-3 text-ink" />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="text-muted">{t("replyEmail")}</span>
        <input
          name="replyEmail"
          type="email"
          required
          defaultValue={defaultEmail}
          className="border border-line bg-surface p-3 text-ink"
        />
      </label>
      <div className="hidden" aria-hidden>
        <label>
          website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" disabled={pending} className="institutional-button institutional-button--primary">
        {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
