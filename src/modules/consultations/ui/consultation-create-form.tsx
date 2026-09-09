"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createConsultationAction } from "../actions";

export function ConsultationCreateForm({ tracks }: { tracks: Array<{ id: string; nameAr: string; nameEn: string }> }) {
  const t = useTranslations("consultations");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return <form className="mt-8 grid gap-5 rounded-2xl border border-sand p-6" onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await createConsultationAction({
        trackId: String(data.get("trackId") || "") || undefined,
        subject: String(data.get("subject") || ""),
        description: String(data.get("description") || ""),
        desiredOutcome: String(data.get("desiredOutcome") || "") || undefined,
        urgency: data.get("urgency") === "urgent" ? "urgent" : "normal",
      });
      if (result.ok && result.id) router.push(`/account/consultations/${result.id}`);
      else setMessage(t("failed"));
    });
  }}>
    <label>{t("track")}<select name="trackId" className="mt-2 w-full border border-sand bg-white p-3"><option value="">{t("general")}</option>{tracks.map((track) => <option key={track.id} value={track.id}>{locale === "ar" ? track.nameAr : track.nameEn}</option>)}</select></label>
    <label>{t("subject")}<input name="subject" required minLength={4} maxLength={180} className="mt-2 w-full border border-sand p-3" /></label>
    <label>{t("description")}<textarea name="description" required minLength={20} rows={6} className="mt-2 w-full border border-sand p-3" /></label>
    <label>{t("desiredOutcome")}<textarea name="desiredOutcome" rows={3} className="mt-2 w-full border border-sand p-3" /></label>
    <label>{t("urgency")}<select name="urgency" className="mt-2 w-full border border-sand bg-white p-3"><option value="normal">{t("normal")}</option><option value="urgent">{t("urgent")}</option></select></label>
    {message ? <p className="text-red-700">{message}</p> : null}
    <button disabled={pending} className="bg-navy px-5 py-3 text-white">{pending ? t("sending") : t("submit")}</button>
  </form>;
}
