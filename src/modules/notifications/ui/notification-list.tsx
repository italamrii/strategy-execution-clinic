"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notifications/actions";

type Item = {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  linkPath: string | null;
  readAt: Date | null;
  createdAt: Date;
  category: string;
};

export function NotificationList({
  items,
  locale,
}: {
  items: Item[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("notifications");
  const [pending, start] = useTransition();

  if (!items.length) {
    return <p className="mt-10 text-muted">{t("empty")}</p>;
  }

  return (
    <div className="mt-10 space-y-4">
      <button
        type="button"
        disabled={pending}
        className="border border-line px-3 py-2 text-sm"
        onClick={() => start(() => void markAllNotificationsReadAction())}
      >
        {t("markAllRead")}
      </button>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className={`border border-line p-4 ${item.readAt ? "bg-canvas" : "bg-surface"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted">{item.category}</p>
                <h2 className="text-lg text-navy">
                  {locale === "ar" ? item.titleAr : item.titleEn}
                </h2>
                <p className="mt-1 text-sm text-graphite">
                  {locale === "ar" ? item.bodyAr : item.bodyEn}
                </p>
                {item.linkPath ? (
                  <Link href={item.linkPath} className="mt-2 inline-block text-sm text-gold">
                    {t("open")}
                  </Link>
                ) : null}
              </div>
              {!item.readAt ? (
                <button
                  type="button"
                  className="text-sm text-navy"
                  onClick={() =>
                    start(() => void markNotificationReadAction(item.id))
                  }
                >
                  {t("markRead")}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
