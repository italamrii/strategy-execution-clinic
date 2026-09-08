"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  adminRevokeCredentialAction,
  adminSuspendCredentialAction,
} from "@/modules/credentials/actions";

export function AdminCredentialActions({
  credentialId,
  status,
}: {
  credentialId: string;
  status: string;
}) {
  const t = useTranslations("adminCredential");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: "suspend" | "revoke") {
    startTransition(async () => {
      const result =
        action === "suspend"
          ? await adminSuspendCredentialAction({ credentialId, reason })
          : await adminRevokeCredentialAction({ credentialId, reason });
      if (result.ok) {
        setMessage(t("actionSuccess"));
        router.refresh();
      } else {
        setMessage(t("actionFailed"));
      }
    });
  }

  return (
    <section className="mt-8 border border-line bg-surface p-6">
      <h2 className="text-lg text-ink">{t("actionsTitle")}</h2>
      <label className="mt-4 block text-sm text-muted">
        {t("reason")}
        <textarea
          className="mt-2 w-full border border-line bg-canvas p-3 text-sm text-ink"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        {status === "active" ? (
          <button
            type="button"
            disabled={pending || !reason.trim()}
            onClick={() => run("suspend")}
            className="border border-warning px-4 py-2 text-sm text-ink disabled:opacity-50"
          >
            {t("suspend")}
          </button>
        ) : null}
        {status !== "revoked" ? (
          <button
            type="button"
            disabled={pending || !reason.trim()}
            onClick={() => run("revoke")}
            className="bg-danger px-4 py-2 text-sm text-surface disabled:opacity-50"
          >
            {t("revoke")}
          </button>
        ) : null}
      </div>
      {message ? <p className="mt-3 text-sm text-graphite">{message}</p> : null}
    </section>
  );
}
