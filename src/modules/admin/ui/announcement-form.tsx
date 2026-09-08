"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createAnnouncementAction } from "@/modules/admin/actions";

export function AnnouncementForm() {
  const t = useTranslations("adminAnnouncements");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-10 space-y-4 border border-line bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await createAnnouncementAction({
            titleAr: String(fd.get("titleAr") ?? ""),
            titleEn: String(fd.get("titleEn") ?? ""),
            bodyAr: String(fd.get("bodyAr") ?? ""),
            bodyEn: String(fd.get("bodyEn") ?? ""),
            audience: String(fd.get("audience") ?? "ALL"),
            severity: String(fd.get("severity") ?? "info"),
            ctaPath: String(fd.get("ctaPath") ?? "") || null,
          });
          setMessage(result.ok ? t("created") : t("failed"));
        });
      }}
    >
      <label className="grid gap-1 text-sm">
        <span>{t("titleAr")}</span>
        <input name="titleAr" required className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("titleEn")}</span>
        <input name="titleEn" required className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("bodyAr")}</span>
        <textarea name="bodyAr" required rows={3} className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("bodyEn")}</span>
        <textarea name="bodyEn" required rows={3} className="border border-line p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("audience")}</span>
        <select name="audience" className="border border-line p-2">
          <option value="ALL">{t("audienceAll")}</option>
          <option value="MEMBERS">{t("audienceMembers")}</option>
          <option value="VOLUNTEERS">{t("audienceVolunteers")}</option>
          <option value="ADMINS">{t("audienceAdmins")}</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("severity")}</span>
        <select name="severity" className="border border-line p-2">
          <option value="info">{t("severityInfo")}</option>
          <option value="warning">{t("severityWarning")}</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t("ctaPath")}</span>
        <input name="ctaPath" placeholder="/membership" className="border border-line p-2" />
      </label>
      <button type="submit" disabled={pending} className="border border-navy bg-navy px-4 py-2 text-surface">
        {t("create")}
      </button>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </form>
  );
}
