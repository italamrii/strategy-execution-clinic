"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createMeetingAction } from "../actions";

export function MeetingCreateForm({ consultationId }: { consultationId?: string }) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  return <form className="mt-8 grid gap-4 rounded-2xl border border-sand p-6" onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setError(null);
    startTransition(async () => {
      const starts = new Date(String(data.get("startsAt"))); const endsRaw = String(data.get("endsAt") || "");
      const result = await createMeetingAction({ consultationId, title: String(data.get("title") || ""), startsAt: starts.toISOString(), endsAt: endsRaw ? new Date(endsRaw).toISOString() : undefined, allowAudio: true, allowVideo: data.get("allowVideo") === "on" });
      if (result.ok && result.id) router.push(`/account/meetings/${result.id}`); else setError(t("failed"));
    });
  }}>
    <h2 className="text-2xl text-ink">{t("schedule")}</h2>
    <label>{t("titleField")}<input name="title" required className="mt-2 w-full border border-sand p-3" /></label>
    <label>{t("startsAt")}<input name="startsAt" type="datetime-local" required className="mt-2 w-full border border-sand p-3" /></label>
    <label>{t("endsAt")}<input name="endsAt" type="datetime-local" className="mt-2 w-full border border-sand p-3" /></label>
    <label className="flex gap-2"><input name="allowVideo" type="checkbox" defaultChecked />{t("allowVideo")}</label>
    {error ? <p className="text-red-700">{error}</p> : null}<button disabled={pending} className="bg-navy px-5 py-3 text-white">{t("create")}</button>
  </form>;
}
