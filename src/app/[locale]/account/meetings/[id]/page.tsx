import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireLocale } from "@/i18n/locale";
import { redirect as localeRedirect } from "@/i18n/navigation";
import { resolvePageAccess } from "@/modules/identity";
import { getMeetingForUser, MeetingError } from "@/modules/meetings";
import { MeetingRoom } from "@/modules/meetings/ui/meeting-room";
import { MeetingStatusActions } from "@/modules/meetings/ui/meeting-status-actions";
import { AccessDenied } from "@/shared/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const access = await resolvePageAccess("meeting.read.own");
  if (access.status === "unauthenticated") localeRedirect({ href: "/login", locale });
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const t = await getTranslations("meetings");
  let meeting;
  try {
    meeting = await getMeetingForUser(access.auth.userId, id);
  } catch (error) {
    if (error instanceof MeetingError && error.code === "forbidden") {
      return <AccessDenied status="forbidden" email={access.auth.email} />;
    }
    if (error instanceof MeetingError && error.code === "not_found") notFound();
    throw error;
  }
  const statusLabel = t(`status.${meeting.status}` as "status.scheduled");
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <p className="eyebrow">SEC · MEET</p>
      <h1 className="mt-3 text-4xl text-ink">{meeting.title}</h1>
      <p className="mt-3 text-graphite">{t("deviceNote")}</p>
      <p className="mt-2 text-sm text-muted">{statusLabel}</p>
      <MeetingStatusActions
        meetingId={meeting.id}
        canStart={meeting.canStart}
        canComplete={meeting.canComplete}
        canCancel={meeting.canCancel}
      />
      {meeting.setupRequired ? (
        <div className="mt-8 border border-warning bg-surface p-6" role="status">
          <h2 className="text-xl text-ink">{t("setupRequiredTitle")}</h2>
          <p className="mt-2 text-graphite">
            {meeting.consultationId ? t("setupRequiredPrivate") : t("setupRequired")}
          </p>
          <ul className="mt-3 list-disc ps-5 text-sm text-graphite">
            {meeting.missingProviderConfig.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : meeting.joinSession && meeting.status !== "cancelled" && meeting.status !== "completed" ? (
        <MeetingRoom
          meetingId={meeting.id}
          session={meeting.joinSession}
          startWithCameraOff={!meeting.allowVideo}
          lang={locale}
          connectionFailedLabel={t("connectionFailed")}
        />
      ) : (
        <p className="mt-8 rounded-2xl bg-stone p-6 text-graphite">{t("roomUnavailable")}</p>
      )}
    </main>
  );
}
