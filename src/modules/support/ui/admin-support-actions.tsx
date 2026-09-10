"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateSupportRequestAction } from "@/modules/support/actions";

export function AdminSupportActions({ requestId, status }: { requestId: string; status: string }) {
  const t = useTranslations("support");
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {(["open", "in_progress", "resolved"] as const)
        .filter((item) => item !== status)
        .map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending}
            className="border border-line px-3 py-2 text-sm"
            onClick={() => start(async () => { await updateSupportRequestAction({ requestId, status: item }); window.location.reload(); })}
          >
            {t(`status.${item}`)}
          </button>
        ))}
    </div>
  );
}
