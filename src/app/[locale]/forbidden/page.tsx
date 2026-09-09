import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { AccessDenied } from "@/shared/ui/access-denied";

export default async function ForbiddenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  await getTranslations("access");
  const auth = await getOptionalAuthContext();
  return (
    <AccessDenied
      status={auth ? "forbidden" : "unauthenticated"}
      email={auth?.email ?? null}
    />
  );
}
