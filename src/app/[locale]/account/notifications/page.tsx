import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
  requireAuthenticatedUser,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { getUnreadNotificationCount, listUserNotifications } from "@/modules/notifications";
import { NotificationList } from "@/modules/notifications/ui/notification-list";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("notifications");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <main className="mx-auto max-w-3xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  }
  try {
    await requireAuthenticatedPermission("notification.read.own");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-3xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }
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
