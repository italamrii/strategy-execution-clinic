import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { getMeetingForUser } from "@/modules/meetings";
import { MeetingRoom } from "@/modules/meetings/ui/meeting-room";

export const dynamic = "force-dynamic";
export default async function MeetingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params; const locale = requireLocale(raw); setRequestLocale(locale);
  const auth = await getOptionalAuthContext(); if (!auth) redirect({ href: "/login", locale });
  const [t, meeting] = await Promise.all([getTranslations("meetings"), getMeetingForUser(auth!.userId, id)]);
  return <main className="mx-auto max-w-7xl px-6 py-10"><p className="eyebrow">SEC · MEET</p><h1 className="mt-3 text-4xl text-ink">{meeting.title}</h1><p className="mt-3 text-graphite">{t("deviceNote")}</p><MeetingRoom meetingId={meeting.id} title={meeting.title} embedUrl={meeting.embedUrl} allowVideo={meeting.allowVideo} /></main>;
}
