"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { logoutAction, logoutAllAction } from "@/modules/identity/actions";

export function LegacySecurityControls({
  sessions,
}: {
  sessions: {
    id: string;
    createdAt: string;
    lastActiveAt: string;
    current: boolean;
  }[];
}) {
  const t = useTranslations("account");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid max-w-2xl gap-8">
      <section>
        <h2 className="text-xl text-ink">{t("sessions")}</h2>
        <ul className="mt-4 divide-y divide-line border border-line bg-surface">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <div>
                <p className="text-ink">
                  {session.current ? t("currentSession") : t("otherSession")}
                </p>
                <p className="numeric text-muted">{session.lastActiveAt}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await logoutAction();
              router.replace("/login");
              router.refresh();
            });
          }}
        >
          {t("logout")}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await logoutAllAction();
              router.replace("/login");
              router.refresh();
            });
          }}
        >
          {t("logoutAll")}
        </Button>
      </div>
    </div>
  );
}
