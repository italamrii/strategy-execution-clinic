import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext, getPermissionsForUser } from "@/modules/identity";
import { getConsultationForUser } from "@/modules/consultations";
import { ConsultationThread } from "@/modules/consultations/ui/consultation-thread";
import { MeetingCreateForm } from "@/modules/meetings/ui/meeting-create-form";

export const dynamic = "force-dynamic";

export default async function ConsultationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params; const locale = requireLocale(raw); setRequestLocale(locale);
  const auth = await getOptionalAuthContext(); if (!auth) redirect({ href: "/login", locale });
  const [t, data, permissions] = await Promise.all([getTranslations("consultations"), getConsultationForUser(auth!.userId, id), getPermissionsForUser(auth!.userId)]);
  const canManage = data.request.assignedExpertUserId === auth!.userId || permissions.includes("consultation.manage");
  const canSchedule = permissions.includes("meeting.create") && canManage;
  return <main className="mx-auto max-w-4xl px-6 py-14"><p className="eyebrow">SEC · ADVISORY</p><h1 className="mt-3 text-4xl text-ink">{data.request.subject}</h1><div className="mt-6 rounded-2xl bg-stone p-6"><p>{data.request.description}</p>{data.request.desiredOutcome ? <p className="mt-4"><strong>{t("desiredOutcome")}:</strong> {data.request.desiredOutcome}</p> : null}<p className="mt-4 text-sm text-graphite">{t("expert")}: {data.expert ? (locale === "ar" ? data.expert.displayNameAr : data.expert.displayNameEn ?? data.expert.displayNameAr) : t("unassigned")}</p></div>
    <section className="mt-8 space-y-4"><h2 className="text-2xl">{t("conversation")}</h2>{data.messages.length ? data.messages.map((message) => <article key={message.id} className={`max-w-[85%] rounded-2xl p-4 ${message.authorUserId === auth!.userId ? "ms-auto bg-navy text-white" : "bg-stone"}`}><p>{message.body}</p><time className="mt-2 block text-xs opacity-70">{new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "short", timeStyle: "short" }).format(message.createdAt)}</time></article>) : <p>{t("noMessages")}</p>}</section>
    <ConsultationThread consultationId={id} canManage={canManage} canCancel={data.request.requesterUserId === auth!.userId && !["completed", "closed", "cancelled"].includes(data.request.status)} />
    {canSchedule ? <MeetingCreateForm consultationId={id} /> : null}
  </main>;
}
