"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { Button } from "@/shared/ui/button";
import {
  reviewTrackApplicationAction,
  reviewTrackContributionAction,
} from "@/modules/tracks/actions";

export function TrackApplicationReviewActions({
  applicationId,
}: {
  applicationId: string;
}) {
  const t = useTranslations("tracks");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await reviewTrackApplicationAction({
              applicationId,
              decision: "approved",
            });
            router.refresh();
          });
        }}
      >
        {t("approve")}
      </Button>
      <Button
        type="button"
        variant="danger"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await reviewTrackApplicationAction({
              applicationId,
              decision: "rejected",
            });
            router.refresh();
          });
        }}
      >
        {t("reject")}
      </Button>
    </div>
  );
}

export function TrackContributionReviewActions({
  contributionId,
}: {
  contributionId: string;
}) {
  const t = useTranslations("tracks");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await reviewTrackContributionAction({
              contributionId,
              decision: "approved",
            });
            router.refresh();
          });
        }}
      >
        {t("approve")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await reviewTrackContributionAction({
              contributionId,
              decision: "changes_requested",
            });
            router.refresh();
          });
        }}
      >
        {t("requestChanges")}
      </Button>
      <Button
        type="button"
        variant="danger"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await reviewTrackContributionAction({
              contributionId,
              decision: "rejected",
            });
            router.refresh();
          });
        }}
      >
        {t("reject")}
      </Button>
    </div>
  );
}
