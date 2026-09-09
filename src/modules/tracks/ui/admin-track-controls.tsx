"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { configureTrackAction } from "@/modules/tracks/actions";

export function AdminTrackControls({
  track,
}: {
  track: {
    id: string;
    code: string;
    name: string;
    status: string;
    applicationsOpen: boolean;
    allowSecondary: boolean;
    maxSecondary: number;
  };
}) {
  const t = useTranslations("tracks");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <article className="flex flex-wrap items-center justify-between gap-4 border border-line bg-surface p-4">
      <div>
        <p className="numeric text-xs text-muted">{track.code}</p>
        <h2 className="text-lg text-navy">{track.name}</h2>
        <p className="text-sm text-muted">
          {track.status} · {track.applicationsOpen ? t("applicationsOpen") : t("applicationsClosed")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await configureTrackAction({
                trackId: track.id,
                applicationsOpen: !track.applicationsOpen,
              });
              router.refresh();
            });
          }}
        >
          {track.applicationsOpen ? t("closeApplications") : t("openApplications")}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending || track.status === "archived"}
          onClick={() => {
            startTransition(async () => {
              await configureTrackAction({
                trackId: track.id,
                status: "archived",
                isEnabled: false,
              });
              router.refresh();
            });
          }}
        >
          {t("archive")}
        </Button>
      </div>
    </article>
  );
}
