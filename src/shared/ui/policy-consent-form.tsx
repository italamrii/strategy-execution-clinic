"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { recordPolicyConsentAction } from "@/modules/content/actions";

export function PolicyConsentForm({ slug, version }: { slug: string; version: string }) {
  const t = useTranslations("policies");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return <p className="mt-8 text-sm text-success">{t("consentSaved")}</p>;
  return (
    <form
      className="mt-10 border border-line bg-surface p-5"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await recordPolicyConsentAction({ slug, version });
          if (result.ok) setDone(true);
        });
      }}
    >
      <p className="text-sm text-graphite">{t("consentPrompt")}</p>
      <button type="submit" disabled={pending} className="mt-4 institutional-button institutional-button--secondary">
        {t("consentAccept")}
      </button>
    </form>
  );
}
