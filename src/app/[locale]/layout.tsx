import type { ReactNode } from "react";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { SiteHeader } from "@/shared/ui/site-header";
import "../globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

const latin = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("a11y");
  const dir = locale === "ar" ? "rtl" : "ltr";
  let signedIn = false;
  let unreadNotifications = 0;
  if (process.env.DATABASE_URL) {
    try {
      const auth = await getOptionalAuthContext();
      signedIn = Boolean(auth);
      if (auth) {
        const { getUnreadNotificationCount } = await import("@/modules/notifications");
        unreadNotifications = await getUnreadNotificationCount(auth.userId);
      }
    } catch {
      signedIn = false;
    }
  }

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${arabic.variable} ${latin.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        <NextIntlClientProvider messages={messages}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
          >
            {t("skip")}
          </a>
          <SiteHeader signedIn={signedIn} unreadNotifications={unreadNotifications} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
