"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateFeatureFlagAction } from "@/modules/admin/actions";

export function FeatureFlagsForm({
  flags,
}: {
  flags: Array<{ id: string; key: string; enabled: boolean; reservedFuture: boolean }>;
}) {
  const t = useTranslations("adminSettings");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <ul className="mt-4 space-y-2">
      {flags.map((flag) => (
        <li key={flag.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface p-3 text-sm">
          <div>
            <span className="font-mono">{flag.key}</span>
            {flag.reservedFuture ? (
              <span className="ms-2 text-muted">({t("reservedFuture")})</span>
            ) : null}
          </div>
          <button
            type="button"
            disabled={pending || flag.reservedFuture}
            className="border border-line px-3 py-1 disabled:opacity-50"
            onClick={() => {
              start(async () => {
                const result = await updateFeatureFlagAction({
                  key: flag.key,
                  enabled: !flag.enabled,
                });
                setMessage(result.ok ? t("saved") : t("failed"));
              });
            }}
          >
            {flag.enabled ? t("enabled") : t("disabled")} · {t("toggle")}
          </button>
        </li>
      ))}
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </ul>
  );
}
