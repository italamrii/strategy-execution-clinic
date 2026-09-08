"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  issueCertificateAction,
  reviewContributionAction,
} from "@/modules/recognition/actions";

export function ContributionReviewActions({
  contributionId,
  userId,
}: {
  contributionId: string;
  userId: string;
}) {
  const t = useTranslations("adminRecognition");
  const [pending, start] = useTransition();

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await reviewContributionAction({ contributionId, decision: "approved" });
            await issueCertificateAction({
              definitionSlug: "approved_contribution",
              userId,
              sourceType: "contribution",
              sourceId: contributionId,
            });
            window.location.reload();
          })
        }
        className="border border-navy bg-navy px-3 py-1 text-sm text-surface"
      >
        {t("approve")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await reviewContributionAction({ contributionId, decision: "rejected" });
            window.location.reload();
          })
        }
        className="border border-line px-3 py-1 text-sm"
      >
        {t("reject")}
      </button>
    </div>
  );
}
