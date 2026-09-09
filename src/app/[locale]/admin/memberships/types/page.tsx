import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listAllMembershipTypes, toMembershipTypeDto } from "@/modules/membership";
import { AdminMembershipNav } from "@/modules/membership/ui/admin-nav";
import { TypeAdminRow } from "@/modules/membership/ui/type-admin-row";

export default async function AdminTypesPage({
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
    await requireAuthenticatedPermission("membership.type.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }

  const types = (await listAllMembershipTypes()).map(toMembershipTypeDto);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("types")}</h1>
      <AdminMembershipNav active="types" />
      <div className="mt-10 space-y-4">
        {types.map((type) => (
          <TypeAdminRow key={type.id} type={type} locale={locale} />
        ))}
      </div>
    </main>
  );
}
