"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateTrackAction } from "@/modules/membership/actions";
import type { TrackDto } from "@/modules/membership/dto";

export function TrackAdminRow({
  track,
  locale,
}: {
  track: TrackDto;
  locale: "ar" | "en";
}) {
  const t = useTranslations("adminMembership");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 border border-line bg-surface p-5 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          await updateTrackAction({
            trackId: track.id,
            isEnabled: form.get("isEnabled") === "on",
            sortOrder: Number(form.get("sortOrder") ?? track.sortOrder),
          });
          router.refresh();
        });
      }}
    >
      <div>
        <p className="text-ink">{locale === "ar" ? track.nameAr : track.nameEn}</p>
        <p className="text-sm text-muted">{track.slug}</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="isEnabled" type="checkbox" defaultChecked={track.isEnabled} />
        {t("enabled")}
      </label>
      <label className="text-sm">
        Sort
        <input
          name="sortOrder"
          type="number"
          defaultValue={track.sortOrder}
          className="ms-2 w-20 border border-line px-2 py-1"
        />
      </label>
      <button type="submit" disabled={pending} className="bg-navy px-4 py-2 text-sm text-surface md:w-fit">
        {t("saveTrack")}
      </button>
    </form>
  );
}
