"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  approveApplicationAction,
  rejectApplicationAction,
  requestChangesAction,
  startReviewAction,
} from "@/modules/membership/actions";

export function ReviewActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: string;
}) {
  const t = useTranslations("adminMembership");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; code?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.code ?? "error");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-8 space-y-4 border border-line bg-surface p-6">
      <label className="block space-y-2 text-sm">
        <span className="text-muted">{t("reason")}</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full border border-line px-3 py-2"
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-muted">{t("internalNotes")}</span>
        <p className="text-xs text-muted">{t("internalNotesHint")}</p>
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={3}
          className="w-full border border-line px-3 py-2"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        {status === "submitted" ? (
          <button
            type="button"
            disabled={pending}
            className="bg-navy px-4 py-2 text-sm text-surface"
            onClick={() => run(() => startReviewAction(applicationId))}
          >
            {t("startReview")}
          </button>
        ) : null}
        {status === "under_review" ? (
          <>
            <button
              type="button"
              disabled={pending}
              className="bg-navy px-4 py-2 text-sm text-surface"
              onClick={() =>
                run(() =>
                  approveApplicationAction({
                    applicationId,
                    reason: reason || undefined,
                    internalNotes: internalNotes || undefined,
                  }),
                )
              }
            >
              {t("approve")}
            </button>
            <button
              type="button"
              disabled={pending}
              className="border border-line px-4 py-2 text-sm"
              onClick={() =>
                run(() =>
                  requestChangesAction({
                    applicationId,
                    reason,
                    internalNotes: internalNotes || undefined,
                  }),
                )
              }
            >
              {t("requestChanges")}
            </button>
            <button
              type="button"
              disabled={pending}
              className="border border-line px-4 py-2 text-sm text-danger"
              onClick={() =>
                run(() =>
                  rejectApplicationAction({
                    applicationId,
                    reason,
                    internalNotes: internalNotes || undefined,
                  }),
                )
              }
            >
              {t("reject")}
            </button>
          </>
        ) : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
