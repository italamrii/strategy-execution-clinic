import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { getAdminApplicationDto } from "@/modules/membership";
import { AdminMembershipNav } from "@/modules/membership/ui/admin-nav";
import { ReviewActions } from "@/modules/membership/ui/review-actions";

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminMembership");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="text-2xl text-ink">{t("unauthorized")}</h1>
      </main>
    );
  }
  try {
    await requireAuthenticatedPermission("membership.application.read.any");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <main className="mx-auto max-w-6xl px-6 py-24">
          <h1 className="text-2xl text-ink">{t("forbidden")}</h1>
        </main>
      );
    }
    throw error;
  }

  const app = await getAdminApplicationDto({
    actorUserId: auth.userId,
    applicationId: id,
  });

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">
        {locale === "ar" ? app.membershipType.nameAr : app.membershipType.nameEn}
      </h1>
      <AdminMembershipNav active="applications" />
      <dl className="mt-10 grid max-w-3xl gap-4 border border-line bg-surface p-8 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("applicant")}</dt>
          <dd className="font-mono text-xs text-ink">{app.userId}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("filterStatus")}</dt>
          <dd className="text-ink">{app.status}</dd>
        </div>
        <div>
          <dt className="text-muted">Headline</dt>
          <dd className="mt-1 text-ink">{app.headline}</dd>
        </div>
        <div>
          <dt className="text-muted">Summary</dt>
          <dd className="mt-1 text-ink">{app.summary}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("internalNotes")}</dt>
          <dd className="mt-1 text-ink">{app.internalNotes ?? "—"}</dd>
        </div>
      </dl>
      <ReviewActions applicationId={app.id} status={app.status} />
    </main>
  );
}
