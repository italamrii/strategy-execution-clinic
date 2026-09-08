"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createOpportunityAction,
  publishOpportunityAction,
} from "@/modules/volunteering/actions";

export function VolunteerOpportunityAdminForm() {
  const t = useTranslations("adminVolunteer");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-4 grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const created = await createOpportunityAction({
            titleAr: String(fd.get("titleAr")),
            titleEn: String(fd.get("titleEn")),
            descriptionAr: String(fd.get("descriptionAr")),
            descriptionEn: String(fd.get("descriptionEn")),
            locationType: "remote",
            maxParticipants: Number(fd.get("maxParticipants")) || undefined,
            expectedHours: Number(fd.get("expectedHours")) || undefined,
            visibility: "public",
          });
          if (!created.ok || !created.id) {
            setMessage(t("createFailed"));
            return;
          }
          const published = await publishOpportunityAction(created.id);
          setMessage(published.ok ? t("published") : t("createFailed"));
        });
      }}
    >
      <input name="titleAr" required placeholder={t("titleAr")} className="border border-line p-2" />
      <input name="titleEn" required placeholder={t("titleEn")} className="border border-line p-2" />
      <textarea name="descriptionAr" required rows={3} className="border border-line p-2" />
      <textarea name="descriptionEn" required rows={3} className="border border-line p-2" />
      <input name="maxParticipants" type="number" min="1" placeholder={t("maxParticipants")} className="border border-line p-2" />
      <input name="expectedHours" type="number" step="0.5" placeholder={t("expectedHours")} className="border border-line p-2" />
      <button type="submit" disabled={pending} className="w-fit border border-navy bg-navy px-5 py-2 text-surface">
        {pending ? t("saving") : t("createAndPublish")}
      </button>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </form>
  );
}
