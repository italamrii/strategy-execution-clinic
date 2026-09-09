import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext, getPermissionsForUser } from "@/modules/identity";
import { listMeetingsForUser } from "@/modules/meetings";
import { MeetingCreateForm } from "@/modules/meetings/ui/meeting-create-form";

export const dynamic = "force-dynamic";
export default async function MeetingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; const locale = requireLocale(raw); setRequestLocale(locale);
  const auth = await getOptionalAuthContext(); if (!auth) redirect({ href: "/login", locale });
  const [t, rows, permissions] = await Promise.all([getTranslations("meetings"), listMeetingsForUser(auth!.userId), getPermissionsForUser(auth!.userId)]);
  return <main className="mx-auto max-w-5xl px-6 py-14"><p className="eyebrow">SEC · MEET</p><h1 className="mt-3 text-4xl text-ink">{t("title")}</h1><p className="mt-3 text-graphite">{t("privacyNote")}</p><div className="mt-8 grid gap-4">{rows.length ? rows.map((row) => <Link key={row.id} href={`/account/meetings/${row.id}`} className="rounded-2xl border border-sand p-5"><strong>{row.title}</strong><p className="mt-2 text-sm text-graphite">{new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(row.startsAt)}</p></Link>) : <p className="rounded-2xl bg-stone p-6">{t("empty")}</p>}</div>{permissions.includes("meeting.manage") ? <MeetingCreateForm /> : null}</main>;
}
