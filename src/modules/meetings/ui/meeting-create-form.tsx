"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createMeetingAction } from "../actions";

export function MeetingCreateForm({
  consultationId,
  providerReady,
  missingConfig = [],
}: {
  consultationId?: string;
  providerReady: boolean;
  missingConfig?: string[];
}) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-8 grid gap-4 rounded-2xl border border-sand p-6"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const starts = new Date(String(data.get("startsAt")));
          const endsRaw = String(data.get("endsAt") || "");
          const result = await createMeetingAction({
            consultationId,
            title: String(data.get("title") || ""),
            startsAt: starts.toISOString(),
            endsAt: endsRaw ? new Date(endsRaw).toISOString() : undefined,
            allowAudio: true,
            allowVideo: data.get("startWithCameraOff") !== "on",
          });
          if (result.ok && result.id) router.push(`/account/meetings/${result.id}`);
          else setError(t("failed"));
        });
      }}
    >
      <h2 className="text-2xl text-ink">{t("schedule")}</h2>
      {!providerReady ? (
        <div className="border border-warning bg-surface p-4 text-sm text-ink" role="status">
          <p>{consultationId ? t("setupRequiredPrivate") : t("setupRequired")}</p>
          <ul className="mt-2 list-disc ps-5 text-graphite">
            {missingConfig.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <label>
        {t("titleField")}
        <input name="title" required className="mt-2 w-full border border-sand p-3" />
      </label>
      <label>
        {t("startsAt")}
        <input name="startsAt" type="datetime-local" required className="mt-2 w-full border border-sand p-3" />
      </label>
      <label>
        {t("endsAt")}
        <input name="endsAt" type="datetime-local" className="mt-2 w-full border border-sand p-3" />
      </label>
      <label className="flex gap-2">
        <input name="startWithCameraOff" type="checkbox" />
        {t("startWithCameraOff")}
      </label>
      <p className="text-xs text-muted">{t("cameraOffHint")}</p>
      {error ? <p className="text-red-700">{error}</p> : null}
      <button disabled={pending} className="bg-navy px-5 py-3 text-white">
        {t("create")}
      </button>
    </form>
  );
}
