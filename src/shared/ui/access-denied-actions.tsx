"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { logoutAction } from "@/modules/identity/actions";
import { Button } from "@/shared/ui/button";

async function signOutEverywhere() {
  await logoutAction();
  const clerk = (window as Window & { Clerk?: { signOut?: (opts?: { redirectUrl?: string }) => Promise<void> } }).Clerk;
  if (clerk?.signOut) {
    await clerk.signOut({ redirectUrl: undefined });
  }
}

export function AccessDeniedActions({
  status,
}: {
  status: "unauthenticated" | "forbidden";
}) {
  const t = useTranslations("access");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {status === "unauthenticated" ? (
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-navy px-6 py-3 text-sm text-white focus-visible:outline-2 focus-visible:outline-gold"
        >
          {t("signIn")}
        </Link>
      ) : (
        <>
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-navy px-6 py-3 text-sm text-white focus-visible:outline-2 focus-visible:outline-gold"
          >
            {t("backToAccount")}
          </Link>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await signOutEverywhere();
                router.replace("/login");
                router.refresh();
              });
            }}
          >
            {t("signOut")}
          </Button>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          window.location.reload();
        }}
      >
        {t("retry")}
      </Button>
    </div>
  );
}
