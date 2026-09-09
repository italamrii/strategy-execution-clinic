import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listContributionsForAdmin } from "@/modules/recognition";
import { ContributionReviewActions } from "@/modules/recognition/ui/contribution-review";
import { RecognitionAdminNav } from "@/modules/recognition/ui/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminContributionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminRecognition");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <AccessDenied status="unauthenticated" />;
  }
  try {
    await requireAuthenticatedPermission("contribution.read.any");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }
  const { items } = await listContributionsForAdmin({
    actorUserId: auth.userId,
    status: "submitted",
    page: 1,
  });

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("contributionsTitle")}</h1>
      <RecognitionAdminNav active="contributions" />
      <ul className="mt-10 space-y-4">
        {items.map((c) => (
          <li key={c.id} className="border border-line bg-surface p-4">
            <p className="text-navy">{locale === "ar" ? c.titleAr : c.titleEn}</p>
            <p className="text-sm text-muted">{c.status} · {c.kind}</p>
            <ContributionReviewActions contributionId={c.id} userId={c.userId} />
          </li>
        ))}
      </ul>
    </main>
  );
}
