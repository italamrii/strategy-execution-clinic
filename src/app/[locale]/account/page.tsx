import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  getPrivateAccount,
  getRolesForUser,
} from "@/modules/identity";

export default async function AccountPage({
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
  const [account, roles, t, credentialT] = await Promise.all([
    getPrivateAccount(auth!.userId),
    getRolesForUser(auth!.userId),
    getTranslations("account"),
    getTranslations("credential"),
  ]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link href="/account" className="border-b border-gold text-navy">
          {t("overview")}
        </Link>
        <Link href="/account/membership" className="text-graphite hover:text-navy">
          {t("membership")}
        </Link>
        <Link href="/account/credential" className="text-graphite hover:text-navy">
          {credentialT("nav")}
        </Link>
        <Link href="/account/volunteer" className="text-graphite hover:text-navy">
          {t("volunteer")}
        </Link>
        <Link href="/account/contributions" className="text-graphite hover:text-navy">
          {t("contributions")}
        </Link>
        <Link href="/account/notifications" className="text-graphite hover:text-navy">
          {t("notifications")}
        </Link>
        <Link href="/account/security" className="text-graphite hover:text-navy">
          {t("security")}
        </Link>
      </nav>
      <dl className="mt-10 grid max-w-xl gap-4 border border-line bg-surface p-8 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("email")}</dt>
          <dd className="text-ink">{account?.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("status")}</dt>
          <dd className="text-ink">{account?.status}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("locale")}</dt>
          <dd className="text-ink">{account?.locale}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("roles")}</dt>
          <dd className="text-ink">{roles.join(", ")}</dd>
        </div>
      </dl>
      <p className="mt-6 max-w-xl text-sm text-muted">{t("privateNote")}</p>
    </main>
  );
}
