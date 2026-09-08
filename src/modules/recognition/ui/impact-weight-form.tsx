"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateImpactWeightAction } from "@/modules/recognition/actions";

type ImpactRuleRow = {
  id: string;
  eventKind: string;
  weight: string;
  isEnabled: boolean;
};

export function ImpactWeightForm({ rules }: { rules: ImpactRuleRow[] }) {
  const t = useTranslations("adminRecognition");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mt-10 space-y-6">
      {rules.map((rule) => (
        <form
          key={rule.id}
          className="border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const weight = Number(fd.get("weight"));
            start(async () => {
              const result = await updateImpactWeightAction({
                eventKind: rule.eventKind,
                weight,
              });
              setMessage(result.ok ? t("impactSaved") : t("failed"));
            });
          }}
        >
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-sm text-muted">{t("impactEventKind")}</p>
              <p className="font-mono text-navy">{rule.eventKind}</p>
            </div>
            <label className="grid gap-1 text-sm">
              <span>{t("impactWeight")}</span>
              <input
                name="weight"
                type="number"
                min={0}
                max={1000}
                step="0.01"
                required
                defaultValue={rule.weight}
                className="border border-line p-2"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="border border-navy bg-navy px-4 py-2 text-surface"
            >
              {t("save")}
            </button>
          </div>
        </form>
      ))}
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </div>
  );
}
