"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateMeetingStatusAction } from "../actions";
import { Button } from "@/shared/ui/button";

export function MeetingStatusActions({
  meetingId,
  canStart,
  canComplete,
  canCancel,
}: {
  meetingId: string;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
}) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(status: "live" | "completed" | "cancelled", confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await updateMeetingStatusAction({ meetingId, status });
      if (!result.ok) {
        setError(t("statusFailed"));
        return;
      }
      router.refresh();
    });
  }

  if (!canStart && !canComplete && !canCancel) return null;

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {canStart ? (
        <Button type="button" disabled={pending} onClick={() => run("live")}>
          {t("start")}
        </Button>
      ) : null}
      {canComplete ? (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => run("completed")}>
          {t("complete")}
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => run("cancelled", t("cancelConfirm"))}
        >
          {t("cancel")}
        </Button>
      ) : null}
      {error ? <p className="w-full text-sm text-danger">{error}</p> : null}
    </div>
  );
}
