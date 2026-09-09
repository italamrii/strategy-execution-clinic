import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess, requireAuthenticatedUser } from "@/modules/identity";
import { getUnreadNotificationCount, listUserNotifications } from "@/modules/notifications";
import { NotificationList } from "@/modules/notifications/ui/notification-list";
import { AccessDenied } from "@/shared/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const access = await resolvePageAccess("notification.read.own");
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const t = await getTranslations("notifications");
  const user = await requireAuthenticatedUser();
  const { items } = await listUserNotifications({ userId: user.userId });
  const unread = await getUnreadNotificationCount(user.userId);

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("unread", { count: unread })}</p>
      <NotificationList items={items} locale={locale} />
    </main>
  );
}
