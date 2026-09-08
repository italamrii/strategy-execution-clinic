"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { activateVolunteerProfileAction } from "@/modules/volunteering/actions";

export function VolunteerActivateForm() {
  const t = useTranslations("volunteerDashboard");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-6 grid max-w-lg gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await activateVolunteerProfileAction({
            availability: String(fd.get("availability") ?? "") || undefined,
            city: String(fd.get("city") ?? "") || undefined,
            locationPreference: (fd.get("locationPreference") as "remote" | "onsite" | "hybrid" | "any") || undefined,
          });
          setMessage(result.ok ? t("activateSuccess") : t("errors.forbidden"));
          if (result.ok) window.location.reload();
        });
      }}
    >
      <label className="grid gap-1 text-sm">
        <span>{t("availability")}</span>
        <input name="availability" className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("city")}</span>
        <input name="city" className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("locationPreference")}</span>
        <select name="locationPreference" className="border border-line p-2">
          <option value="any">{t("anyLocation")}</option>
          <option value="remote">{t("remote")}</option>
          <option value="onsite">{t("onsite")}</option>
          <option value="hybrid">{t("hybrid")}</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-fit border border-navy bg-navy px-5 py-2 text-surface"
      >
        {pending ? t("activating") : t("activate")}
      </button>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </form>
  );
}
