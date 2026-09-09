import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { listConsultationsForUser, listEligibleConsultationExperts } from "@/modules/consultations";
import { ConsultationAssignForm } from "@/modules/consultations/ui/consultation-assign-form";
import { AccessDenied } from "@/shared/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function AdminConsultationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const access = await resolvePageAccess("consultation.read.any");
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const t = await getTranslations("consultations");
  const [rows, experts] = await Promise.all([
    listConsultationsForUser(access.auth.userId),
    listEligibleConsultationExperts(),
  ]);
  const statusLabels: Record<string, string> = {
    submitted: t("status.submitted"),
    assigned: t("status.assigned"),
    in_progress: t("status.in_progress"),
    completed: t("status.completed"),
    closed: t("status.closed"),
    cancelled: t("status.cancelled"),
  };
  const expertName = (id: string | null) => {
    if (!id) return t("unassigned");
    const expert = experts.find((item) => item.userId === id);
    if (!expert) return t("assigned");
    return (locale === "ar" ? expert.displayNameAr : expert.displayNameEn) || expert.displayNameAr || t("assigned");
  };
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-4xl text-ink">{t("adminTitle")}</h1>
      <div className="mt-10 grid gap-4">
        {rows.length === 0 ? <p className="rounded-2xl bg-stone p-6">{t("empty")}</p> : null}
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-sand p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <strong>{row.subject}</strong>
              <span>{statusLabels[row.status] ?? row.status}</span>
            </div>
            <p className="mt-3 text-sm text-graphite">{row.description}</p>
            {!row.assignedExpertUserId ? (
              <ConsultationAssignForm consultationId={row.id} experts={experts} locale={locale} />
            ) : (
              <p className="mt-3 text-sm">{t("assigned")}: {expertName(row.assignedExpertUserId)}</p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
