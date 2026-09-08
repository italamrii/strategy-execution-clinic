"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { revokeCertificateAction } from "@/modules/recognition/actions";

export function CertificateRevokeForm() {
  const t = useTranslations("adminRecognition");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await revokeCertificateAction({
            certificateId: String(fd.get("certificateId")),
            reason: String(fd.get("reason")),
          });
          setMessage(result.ok ? t("revoked") : t("failed"));
        });
      }}
    >
      <input
        name="certificateId"
        required
        placeholder={t("certificateId")}
        className="border border-line p-2"
      />
      <input name="reason" required placeholder={t("reason")} className="border border-line p-2" />
      <button
        type="submit"
        disabled={pending}
        className="w-fit border border-navy bg-navy px-4 py-2 text-surface"
      >
        {t("revoke")}
      </button>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </form>
  );
}
