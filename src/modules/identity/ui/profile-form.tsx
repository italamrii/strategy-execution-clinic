"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/text-field";
import { updateProfileAction } from "@/modules/identity/actions";
import type { PrivateAccountDto } from "@/modules/identity";

export function ProfileForm({ account }: { account: PrivateAccountDto }) {
  const t = useTranslations("account");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayNameAr: account.displayNameAr,
    displayNameEn: account.displayNameEn ?? "",
    headlineAr: account.headlineAr ?? "",
    headlineEn: account.headlineEn ?? "",
    bioAr: account.bioAr ?? "",
    bioEn: account.bioEn ?? "",
    legalName: account.legalName ?? "",
    directoryOptIn: account.directoryOptIn,
    visibility: account.visibility,
  });

  return (
    <form
      className="grid max-w-2xl gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await updateProfileAction({
            displayNameAr: form.displayNameAr,
            displayNameEn: form.displayNameEn || null,
            headlineAr: form.headlineAr || null,
            headlineEn: form.headlineEn || null,
            bioAr: form.bioAr || null,
            bioEn: form.bioEn || null,
            legalName: form.legalName || null,
            visibility: form.visibility,
            directoryOptIn: form.directoryOptIn,
            role: "super_admin",
            roleId: "ignored",
          });
          if (!result.ok) {
            setMessage(t("saveFailed"));
            return;
          }
          setMessage(t("saved"));
          router.refresh();
        });
      }}
    >
      <TextField
        label={t("displayNameAr")}
        name="displayNameAr"
        value={form.displayNameAr}
        onChange={(event) => setForm((prev) => ({ ...prev, displayNameAr: event.target.value }))}
        required
      />
      <TextField
        label={t("displayNameEn")}
        name="displayNameEn"
        value={form.displayNameEn}
        onChange={(event) => setForm((prev) => ({ ...prev, displayNameEn: event.target.value }))}
      />
      <TextField
        label={t("headlineAr")}
        name="headlineAr"
        value={form.headlineAr}
        onChange={(event) => setForm((prev) => ({ ...prev, headlineAr: event.target.value }))}
      />
      <TextField
        label={t("headlineEn")}
        name="headlineEn"
        value={form.headlineEn}
        onChange={(event) => setForm((prev) => ({ ...prev, headlineEn: event.target.value }))}
      />
      <label className="grid gap-2 text-sm font-medium text-ink">
        {t("bioAr")}
        <textarea
          className="min-h-28 border border-line bg-surface px-3 py-2 text-ink"
          value={form.bioAr}
          onChange={(event) => setForm((prev) => ({ ...prev, bioAr: event.target.value }))}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-ink">
        {t("bioEn")}
        <textarea
          className="min-h-28 border border-line bg-surface px-3 py-2 text-ink"
          value={form.bioEn}
          onChange={(event) => setForm((prev) => ({ ...prev, bioEn: event.target.value }))}
        />
      </label>
      <TextField
        label={t("legalName")}
        name="legalName"
        value={form.legalName}
        onChange={(event) => setForm((prev) => ({ ...prev, legalName: event.target.value }))}
        hint={t("legalNameHint")}
      />
      <label className="grid gap-2 text-sm font-medium text-ink">
        {t("visibility")}
        <select
          className="min-h-11 border border-line bg-surface px-3"
          value={form.visibility}
          onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
        >
          <option value="private">{t("visibilityPrivate")}</option>
          <option value="members">{t("visibilityMembers")}</option>
          <option value="public">{t("visibilityPublic")}</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={form.directoryOptIn}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, directoryOptIn: event.target.checked }))
          }
        />
        {t("directoryOptIn")}
      </label>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
