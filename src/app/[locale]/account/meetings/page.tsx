import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { listMeetingsForUser, resolveMeetingProviderReadiness } from "@/modules/meetings";
import { MeetingCreateForm } from "@/modules/meetings/ui/meeting-create-form";
import { AccessDenied } from "@/shared/ui/access-denied";
import { redirect } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const access = await resolvePageAccess("meeting.read.own");
  if (access.status === "unauthenticated") redirect({ href: "/login", locale });
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const [t, rows] = await Promise.all([
    getTranslations("meetings"),
    listMeetingsForUser(access.auth.userId),
  ]);
  const canCreate = access.auth.permissions.includes("meeting.create");
  const provider = await resolveMeetingProviderReadiness();
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <p className="eyebrow">SEC · MEET</p>
      <h1 className="mt-3 text-4xl text-ink">{t("title")}</h1>
      <p className="mt-3 text-graphite">{t("privacyNote")}</p>
      <div className="mt-8 grid gap-4">
        {rows.length ? (
          rows.map((row) => (
            <Link key={row.id} href={`/account/meetings/${row.id}`} className="rounded-2xl border border-sand p-5">
              <strong>{row.title}</strong>
              <p className="mt-2 text-sm text-graphite">
                {new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(row.startsAt)}
              </p>
              <p className="mt-1 text-xs text-muted">{t(`status.${row.status}` as "status.scheduled")}</p>
            </Link>
          ))
        ) : (
          <p className="rounded-2xl bg-stone p-6">{t("empty")}</p>
        )}
      </div>
      {canCreate ? (
        <MeetingCreateForm
          providerReady={provider.ready}
          missingConfig={[...new Set([...provider.setup.missing, ...provider.probe.reasons])]}
        />
      ) : null}
    </main>
  );
}
