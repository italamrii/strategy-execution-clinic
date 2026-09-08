import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext, getPrivateAccount } from "@/modules/identity";
import { ProfileForm } from "@/modules/identity/ui/profile-form";

export default async function AccountProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const auth = await getOptionalAuthContext();
  if (!auth) {
    redirect({ href: "/login", locale });
  }
  const account = await getPrivateAccount(auth!.userId);
  const t = await getTranslations("account");
  if (!account) {
    redirect({ href: "/login", locale });
  }

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("profile")}</h1>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/account" className="text-graphite hover:text-navy">
          {t("overview")}
        </Link>
        <Link href="/account/profile" className="border-b border-gold text-navy">
          {t("profile")}
        </Link>
        <Link href="/account/security" className="text-graphite hover:text-navy">
          {t("security")}
        </Link>
      </nav>
      <div className="mt-10">
        <ProfileForm account={account!} />
      </div>
    </main>
  );
}
