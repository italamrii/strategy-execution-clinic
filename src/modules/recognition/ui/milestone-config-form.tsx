"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateMilestoneConfigAction } from "@/modules/recognition/actions";

type MilestoneRow = {
  id: string;
  kind: string;
  threshold: number;
  nameAr: string;
  nameEn: string;
  isEnabled: boolean;
  sortOrder: number;
};

export function MilestoneConfigForm({ milestones }: { milestones: MilestoneRow[] }) {
  const t = useTranslations("adminRecognition");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mt-10 space-y-6">
      {milestones.map((milestone) => (
        <form
          key={milestone.id}
          className="border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const result = await updateMilestoneConfigAction({
                milestoneId: milestone.id,
                isEnabled: fd.get("isEnabled") === "on",
                threshold: Number(fd.get("threshold")),
                nameAr: String(fd.get("nameAr")),
                nameEn: String(fd.get("nameEn")),
                sortOrder: Number(fd.get("sortOrder")),
              });
              setMessage(result.ok ? t("milestoneSaved") : t("failed"));
            });
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <p className="text-sm text-muted md:col-span-2">
              {t("milestoneKind")}: {milestone.kind}
            </p>
            <label className="grid gap-1 text-sm">
              <span>{t("milestoneThreshold")}</span>
              <input
                name="threshold"
                type="number"
                min={1}
                max={10000}
                required
                defaultValue={milestone.threshold}
                className="border border-line p-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t("milestoneSortOrder")}</span>
              <input
                name="sortOrder"
                type="number"
                min={0}
                max={10000}
                required
                defaultValue={milestone.sortOrder}
                className="border border-line p-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t("milestoneNameAr")}</span>
              <input
                name="nameAr"
                required
                defaultValue={milestone.nameAr}
                className="border border-line p-2"
                dir="rtl"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t("milestoneNameEn")}</span>
              <input
                name="nameEn"
                required
                defaultValue={milestone.nameEn}
                className="border border-line p-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                name="isEnabled"
                type="checkbox"
                defaultChecked={milestone.isEnabled}
              />
              <span>{t("milestoneEnabled")}</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-4 border border-navy bg-navy px-4 py-2 text-surface"
          >
            {t("save")}
          </button>
        </form>
      ))}
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </div>
  );
}
