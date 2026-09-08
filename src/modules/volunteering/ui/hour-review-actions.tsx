"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { adjustHoursAction, reviewHoursAction } from "@/modules/volunteering/actions";

export function VolunteerHourReviewActions({
  entryId,
  status,
}: {
  entryId: string;
  status: string;
}) {
  const t = useTranslations("adminVolunteer");
  const [pending, start] = useTransition();

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {status === "pending" ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await reviewHoursAction({ entryId, decision: "approved" });
                window.location.reload();
              })
            }
            className="border border-navy bg-navy px-3 py-1 text-sm text-surface"
          >
            {t("approveHours")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await reviewHoursAction({ entryId, decision: "rejected" });
                window.location.reload();
              })
            }
            className="border border-line px-3 py-1 text-sm"
          >
            {t("rejectHours")}
          </button>
        </>
      ) : null}
      {status === "approved" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await adjustHoursAction({
                entryId,
                deltaHours: -2,
                reason: "Administrative correction after review",
              });
              window.location.reload();
            })
          }
          className="border border-line px-3 py-1 text-sm"
        >
          {t("adjustMinus2")}
        </button>
      ) : null}
    </div>
  );
}
