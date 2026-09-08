"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateSystemSettingAction } from "@/modules/admin/actions";

export function SettingsForm({
  settings,
}: {
  settings: Array<{ key: string; value: unknown }>;
}) {
  const t = useTranslations("adminSettings");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mt-10 space-y-4">
      {settings.map((setting) => (
        <form
          key={setting.key}
          className="border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const result = await updateSystemSettingAction({
                key: setting.key,
                value: fd.get("value"),
              });
              setMessage(result.ok ? t("saved") : t("failed"));
            });
          }}
        >
          <label className="grid gap-1 text-sm">
            <span className="font-mono text-muted">{setting.key}</span>
            <input
              name="value"
              defaultValue={String(setting.value ?? "")}
              className="border border-line p-2"
            />
          </label>
          <button type="submit" disabled={pending} className="mt-3 border border-navy bg-navy px-4 py-2 text-surface">
            {t("save")}
          </button>
        </form>
      ))}
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </div>
  );
}
