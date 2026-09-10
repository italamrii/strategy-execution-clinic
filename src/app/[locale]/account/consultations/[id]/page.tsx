import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { ConsultationError, getConsultationForUser } from "@/modules/consultations";
import { ConsultationThread } from "@/modules/consultations/ui/consultation-thread";
import { MeetingCreateForm } from "@/modules/meetings/ui/meeting-create-form";
import { meetingProviderSetup } from "@/modules/meetings";
import { AccessDenied } from "@/shared/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const access = await resolvePageAccess(["consultation.read.own", "consultation.read.any", "consultation.read.assigned"]);
  if (access.status === "unauthenticated") redirect({ href: "/login", locale });
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const t = await getTranslations("consultations");
  let data;
  try {
    data = await getConsultationForUser(access.auth.userId, id);
  } catch (error) {
    if (error instanceof ConsultationError && error.code === "forbidden") {
      return <AccessDenied status="forbidden" email={access.auth.email} />;
    }
    if (error instanceof ConsultationError && error.code === "not_found") notFound();
    throw error;
  }
  const canManage =
    data.request.assignedExpertUserId === access.auth.userId ||
    access.auth.permissions.includes("consultation.manage");
  const canSchedule = access.auth.permissions.includes("meeting.create") && canManage;
  const provider = meetingProviderSetup();
  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <p className="eyebrow">SEC · ADVISORY</p>
      <h1 className="mt-3 text-4xl text-ink">{data.request.subject}</h1>
      <div className="mt-6 rounded-2xl bg-stone p-6">
        <p>{data.request.description}</p>
        {data.request.desiredOutcome ? (
          <p className="mt-4"><strong>{t("desiredOutcome")}:</strong> {data.request.desiredOutcome}</p>
        ) : null}
        <p className="mt-4 text-sm text-graphite">
          {t("expert")}: {data.expert ? (locale === "ar" ? data.expert.displayNameAr : data.expert.displayNameEn ?? data.expert.displayNameAr) : t("unassigned")}
        </p>
      </div>
      <section className="mt-8 space-y-4">
        <h2 className="text-2xl">{t("conversation")}</h2>
        {data.messages.length ? (
          data.messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[85%] rounded-2xl p-4 ${message.authorUserId === access.auth.userId ? "ms-auto bg-navy text-white" : "bg-stone"}`}
            >
              {message.kind && message.kind !== "message" ? (
                <p className="mb-2 text-xs uppercase tracking-wide opacity-80">
                  {message.kind === "deliverable" ? t("kindDeliverable") : t("kindFeedback")}
                </p>
              ) : null}
              <p>{message.body}</p>
              <time className="mt-2 block text-xs opacity-70">
                {new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "short", timeStyle: "short" }).format(message.createdAt)}
              </time>
            </article>
          ))
        ) : (
          <p>{t("noMessages")}</p>
        )}
      </section>
      <ConsultationThread
        consultationId={id}
        canManage={canManage}
        canCancel={data.request.requesterUserId === access.auth.userId && !["completed", "closed", "cancelled"].includes(data.request.status)}
        canFeedback={data.request.requesterUserId === access.auth.userId && data.request.status === "completed"}
        canClose={access.auth.permissions.includes("consultation.manage") && data.request.status === "completed"}
      />
      {canSchedule ? (
        <MeetingCreateForm
          consultationId={id}
          providerReady={provider.secure}
          missingConfig={provider.missing}
        />
      ) : null}
    </main>
  );
}
