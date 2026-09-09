"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { assignConsultationAction } from "../actions";

export function ConsultationAssignForm({ consultationId, experts, locale }: { consultationId: string; experts: Array<{ userId: string; displayNameAr: string | null; displayNameEn: string | null }>; locale: string }) {
  const t = useTranslations("consultations"); const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  return <form className="mt-4 flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => { const result = await assignConsultationAction({ consultationId, expertUserId: String(data.get("expertUserId") || "") }); if (result.ok) window.location.reload(); else setError(t("failed")); }); }}><select name="expertUserId" required className="min-w-72 border border-sand bg-white p-2"><option value="">{t("chooseExpert")}</option>{experts.map((expert) => <option key={expert.userId} value={expert.userId}>{(locale === "ar" ? expert.displayNameAr : expert.displayNameEn) || expert.displayNameAr || expert.userId}</option>)}</select><button disabled={pending || experts.length === 0} className="bg-navy px-4 py-2 text-white">{t("assign")}</button>{experts.length === 0 ? <span className="text-sm text-graphite">{t("noExperts")}</span> : null}{error ? <span className="text-red-700">{error}</span> : null}</form>;
}
