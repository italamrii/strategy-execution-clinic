"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addConsultationMessageAction, updateConsultationStatusAction } from "../actions";

export function ConsultationThread({ consultationId, canManage, canCancel }: { consultationId: string; canManage: boolean; canCancel: boolean }) {
  const t = useTranslations("consultations");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const refresh = () => window.location.reload();
  return <div className="mt-8 space-y-5">
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget); setError(null);
      startTransition(async () => { const result = await addConsultationMessageAction({ consultationId, body: String(data.get("body") || "") }); if (result.ok) refresh(); else setError(t("failed")); });
    }}>
      <textarea name="body" required rows={4} className="border border-sand p-3" placeholder={t("writeReply")} />
      <button disabled={pending} className="bg-navy px-5 py-3 text-white">{t("sendReply")}</button>
    </form>
    <div className="flex flex-wrap gap-3">
      {canManage ? <><button onClick={() => startTransition(async () => { await updateConsultationStatusAction({ consultationId, status: "in_progress" }); refresh(); })} className="border border-gold px-4 py-2">{t("startWork")}</button><button onClick={() => startTransition(async () => { await updateConsultationStatusAction({ consultationId, status: "completed" }); refresh(); })} className="border border-gold px-4 py-2">{t("complete")}</button></> : null}
      {canCancel ? <button onClick={() => startTransition(async () => { await updateConsultationStatusAction({ consultationId, status: "cancelled" }); refresh(); })} className="border border-red-300 px-4 py-2 text-red-700">{t("cancel")}</button> : null}
    </div>
    {error ? <p className="text-red-700">{error}</p> : null}
  </div>;
}
