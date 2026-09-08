"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { applyToOpportunityAction } from "@/modules/volunteering/actions";

export function VolunteerApplyForm({ opportunityId }: { opportunityId: string }) {
  const t = useTranslations("volunteerHub");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-4 grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await applyToOpportunityAction({
            opportunityId,
            motivation: String(fd.get("motivation") ?? ""),
            relevantExperience: String(fd.get("experience") ?? "") || undefined,
            availabilityNote: String(fd.get("availability") ?? "") || undefined,
          });
          setMessage(result.ok ? t("applySuccess") : t("errors.forbidden"));
        });
      }}
    >
      <label className="grid gap-1 text-sm">
        <span>{t("motivation")}</span>
        <textarea name="motivation" required minLength={20} rows={4} className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("experience")}</span>
        <textarea name="experience" rows={3} className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("availability")}</span>
        <input name="availability" className="border border-line p-2" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-fit border border-navy bg-navy px-5 py-2 text-surface disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submitApplication")}
      </button>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </form>
  );
}
