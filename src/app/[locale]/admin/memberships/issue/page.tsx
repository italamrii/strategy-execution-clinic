import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import {
  listAllMembershipTypes,
  listAllTracks,
  toMembershipTypeDto,
  toTrackDto,
} from "@/modules/membership";
import { AdminMembershipNav } from "@/modules/membership/ui/admin-nav";
import { DirectIssueForm } from "@/modules/membership/ui/direct-issue-form";

export default async function AdminIssuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminMembership");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <AccessDenied status="unauthenticated" />;
  }
  try {
    await requireAuthenticatedPermission("membership.issue");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }

  const [types, tracks] = await Promise.all([
    listAllMembershipTypes(),
    listAllTracks(),
  ]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("issue")}</h1>
      <AdminMembershipNav active="issue" />
      <DirectIssueForm
        locale={locale}
        types={types.map(toMembershipTypeDto)}
        tracks={tracks.map(toTrackDto)}
      />
    </main>
  );
}
