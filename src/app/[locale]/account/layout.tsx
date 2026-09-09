import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { MemberShell } from "@/shared/ui/member-shell";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const auth = await getOptionalAuthContext();
  if (!auth) {
    redirect({ href: "/login", locale });
  }
  const account = await getTranslations("account");
  const credential = await getTranslations("credential");
  return (
    <MemberShell
      labels={{
        title: account("title"),
        subtitle: account("memberAreaSubtitle"),
        overview: account("overview"),
        profile: account("profile"),
        membership: account("membership"),
        credential: credential("nav"),
        volunteer: account("volunteer"),
        tracks: account("tracks"),
        contributions: account("contributions"),
        consultations: account("consultations"),
        meetings: account("meetings"),
        notifications: account("notifications"),
        security: account("security"),
        privacy: account("privateNote"),
      }}
    >
      {children}
    </MemberShell>
  );
}
