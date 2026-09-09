import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { listPublicOperatingTracks } from "@/modules/tracks";
import { listConsultationsForUser } from "@/modules/consultations";
import { ConsultationCreateForm } from "@/modules/consultations/ui/consultation-create-form";
import { AccessDenied } from "@/shared/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function ConsultationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const access = await resolvePageAccess(["consultation.read.own", "consultation.read.any", "consultation.read.assigned"]);
  if (access.status === "unauthenticated") redirect({ href: "/login", locale });
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const [t, rows, tracks] = await Promise.all([
    getTranslations("consultations"),
    listConsultationsForUser(access.auth.userId),
    listPublicOperatingTracks(),
  ]);
  const statusLabels: Record<string, string> = {
    submitted: t("status.submitted"),
    assigned: t("status.assigned"),
    in_progress: t("status.in_progress"),
    completed: t("status.completed"),
    closed: t("status.closed"),
    cancelled: t("status.cancelled"),
  };
  const canCreate = access.auth.permissions.includes("consultation.create");
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <p className="eyebrow">SEC · ADVISORY</p>
      <h1 className="mt-3 text-4xl text-ink">{t("title")}</h1>
      <p className="mt-3 text-graphite">{t("privacyNote")}</p>
      <div className="mt-8 grid gap-4">
        {rows.length ? (
          rows.map((row) => (
            <Link key={row.id} href={`/account/consultations/${row.id}`} className="rounded-2xl border border-sand p-5 hover:border-gold">
              <div className="flex justify-between gap-4">
                <strong>{row.subject}</strong>
                <span className="text-sm text-graphite">{statusLabels[row.status] ?? row.status}</span>
              </div>
              <p className="mt-2 text-sm text-graphite">
                {new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" }).format(row.submittedAt)}
              </p>
            </Link>
          ))
        ) : (
          <p className="rounded-2xl bg-stone p-6">{t("empty")}</p>
        )}
      </div>
      {canCreate ? <ConsultationCreateForm tracks={tracks} /> : null}
    </main>
  );
}
