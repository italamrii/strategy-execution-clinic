"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { submitHoursAction } from "@/modules/volunteering/actions";

export function VolunteerHoursForm() {
  const t = useTranslations("volunteerDashboard");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-4 grid max-w-lg gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await submitHoursAction({
            hours: Number(fd.get("hours")),
            activityDate: String(fd.get("activityDate")),
            description: String(fd.get("description")),
          });
          setMessage(result.ok ? t("hoursSubmitted") : t("errors.forbidden"));
          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <label className="grid gap-1 text-sm">
        <span>{t("hours")}</span>
        <input name="hours" type="number" step="0.25" min="0.25" max="24" required className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("activityDate")}</span>
        <input name="activityDate" type="date" required className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("description")}</span>
        <textarea name="description" required minLength={10} rows={3} className="border border-line p-2" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-fit border border-navy bg-navy px-5 py-2 text-surface"
      >
        {pending ? t("submitHours") + "…" : t("submitHours")}
      </button>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </form>
  );
}
