import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { listMeetingsForUser } from "@/modules/meetings";
import { AccessDenied } from "@/shared/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function AdminMeetingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const access = await resolvePageAccess("meeting.manage");
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const [t, rows] = await Promise.all([
    getTranslations("meetings"),
    listMeetingsForUser(access.auth.userId),
  ]);
  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-4xl text-ink">{t("adminTitle")}</h1>
      <p className="mt-3 text-graphite">{t("privacyNote")}</p>
      <div className="mt-10 grid gap-4">
        {rows.length ? (
          rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-sand p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <strong>{row.title}</strong>
                <span>{t(`status.${row.status}` as "status.scheduled")}</span>
              </div>
              <p className="mt-2 text-sm text-graphite">
                {new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(row.startsAt)}
              </p>
              <Link href={`/account/meetings/${row.id}`} className="mt-3 inline-block text-sm text-navy">
                {t("openRoom")}
              </Link>
            </article>
          ))
        ) : (
          <p className="rounded-2xl bg-stone p-6">{t("empty")}</p>
        )}
      </div>
    </main>
  );
}
