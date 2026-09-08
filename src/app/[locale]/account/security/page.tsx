import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  listSessionsForUser,
} from "@/modules/identity";
import { SecurityControls } from "@/modules/identity/ui/security-controls";

export default async function AccountSecurityPage({
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
  const sessions = await listSessionsForUser(auth!.userId);
  const t = await getTranslations("account");

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("security")}</h1>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/account" className="text-graphite hover:text-navy">
          {t("overview")}
        </Link>
        <Link href="/account/profile" className="text-graphite hover:text-navy">
          {t("profile")}
        </Link>
        <Link href="/account/security" className="border-b border-gold text-navy">
          {t("security")}
        </Link>
      </nav>
      <div className="mt-10">
        <SecurityControls
          sessions={sessions.map((session) => ({
            id: session.id,
            createdAt: session.createdAt.toISOString(),
            lastActiveAt: session.lastActiveAt.toISOString(),
            current: session.id === auth!.sessionId,
          }))}
        />
      </div>
    </main>
  );
}
