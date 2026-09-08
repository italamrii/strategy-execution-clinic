"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { reviewApplicationAction } from "@/modules/volunteering/actions";

export function VolunteerReviewActions({ applicationId }: { applicationId: string }) {
  const t = useTranslations("adminVolunteer");
  const [pending, start] = useTransition();

  function decide(decision: "accepted" | "rejected") {
    start(async () => {
      await reviewApplicationAction({ applicationId, decision });
      window.location.reload();
    });
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => decide("accepted")}
        className="border border-navy bg-navy px-3 py-1 text-sm text-surface"
      >
        {t("accept")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => decide("rejected")}
        className="border border-line px-3 py-1 text-sm"
      >
        {t("reject")}
      </button>
    </div>
  );
}
