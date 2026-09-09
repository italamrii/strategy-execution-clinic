"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { applyToTrackAction } from "@/modules/tracks/actions";

export function TrackApplyForm({
  trackId,
}: {
  trackId: string;
}) {
  const t = useTranslations("tracks");
  const router = useRouter();
  const [motivation, setMotivation] = useState("");
  const [wantPrimary, setWantPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 border border-line bg-surface p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await applyToTrackAction({
            trackId,
            motivation,
            wantPrimary,
          });
          if (!result.ok) {
            const known = ["membership_required", "already_member", "application_pending", "track_closed"] as const;
            const code = known.includes(result.code as (typeof known)[number])
              ? (result.code as (typeof known)[number])
              : null;
            setError(code ? t(`errors.${code}`) : t("errors.generic"));
            return;
          }
          router.refresh();
        });
      }}
    >
      <label className="grid gap-2 text-sm">
        <span>{t("motivation")}</span>
        <textarea
          className="min-h-28 border border-line bg-canvas px-3 py-2"
          value={motivation}
          onChange={(event) => setMotivation(event.target.value)}
          disabled={pending}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={wantPrimary}
          onChange={(event) => setWantPrimary(event.target.checked)}
          disabled={pending}
        />
        <span>{t("wantPrimary")}</span>
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("applying") : t("apply")}
      </Button>
    </form>
  );
}
