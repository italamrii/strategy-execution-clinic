import { auth, clerkClient } from "@clerk/nextjs/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  listSessionsForUser,
} from "@/modules/identity";
import { SecurityControls } from "@/modules/identity/ui/security-controls";
import { LegacySecurityControls } from "@/modules/identity/ui/legacy-security-controls";
import { isClerkAuthProvider } from "@/shared/config/auth-provider";

export default async function AccountSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const authCtx = await getOptionalAuthContext();
  if (!authCtx) {
    redirect({ href: "/login", locale });
  }
  const t = await getTranslations("account");
  const clerk = isClerkAuthProvider();

  let sessions: {
    id: string;
    createdAt: string;
    lastActiveAt: string;
    current: boolean;
  }[] = [];

  if (clerk) {
    const sessionAuth = await auth();
    const currentSessionId = sessionAuth.sessionId;
    if (sessionAuth.userId) {
      try {
        const client = await clerkClient();
        const list = await client.sessions.getSessionList({
          userId: sessionAuth.userId,
          status: "active",
        });
        sessions = list.data.map((session) => ({
          id: session.id,
          createdAt: new Date(session.createdAt).toISOString(),
          lastActiveAt: new Date(session.lastActiveAt).toISOString(),
          current: session.id === currentSessionId,
        }));
      } catch {
        sessions = currentSessionId
          ? [
              {
                id: currentSessionId,
                createdAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                current: true,
              },
            ]
          : [];
      }
    }
  } else {
    const rows = await listSessionsForUser(authCtx!.userId);
    sessions = rows.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      current: session.id === authCtx!.sessionId,
    }));
  }

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
        {clerk ? (
          <SecurityControls sessions={sessions} />
        ) : (
          <LegacySecurityControls sessions={sessions} />
        )}
      </div>
    </main>
  );
}
