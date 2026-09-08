import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { listOwnCredentials } from "@/modules/credentials";
import { CredentialWallet } from "@/modules/credentials/ui/credential-wallet";

export default async function AccountCredentialPage({
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
  const [credentials, t, accountT] = await Promise.all([
    listOwnCredentials(auth!.userId),
    getTranslations("credential"),
    getTranslations("account"),
  ]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("accountTitle")}</h1>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/account" className="text-graphite hover:text-navy">
          {accountT("overview")}
        </Link>
        <Link href="/account/membership" className="text-graphite hover:text-navy">
          {accountT("membership")}
        </Link>
        <Link href="/account/credential" className="border-b border-gold text-navy">
          {t("nav")}
        </Link>
        <Link href="/account/profile" className="text-graphite hover:text-navy">
          {accountT("profile")}
        </Link>
      </nav>
      <div className="mt-12">
        <CredentialWallet credentials={credentials} locale={locale} />
      </div>
    </main>
  );
}
