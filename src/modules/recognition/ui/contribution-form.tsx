"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { submitContributionAction } from "@/modules/recognition/actions";

export function ContributionSubmitForm({
  types,
  locale,
}: {
  types: { id: string; nameAr: string; nameEn: string }[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("recognition");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-4 grid max-w-xl gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await submitContributionAction({
            contributionTypeId: String(fd.get("typeId")),
            titleAr: String(fd.get("titleAr")),
            titleEn: String(fd.get("titleEn")),
            descriptionAr: String(fd.get("descriptionAr") || "") || undefined,
            descriptionEn: String(fd.get("descriptionEn") || "") || undefined,
            visibility: "public",
          });
          setMessage(result.ok ? t("submitSuccess") : t("errors.forbidden"));
          if (result.ok) router.refresh();
        });
      }}
    >
      <select name="typeId" required className="border border-line p-2">
        {types.map((type) => (
          <option key={type.id} value={type.id}>
            {locale === "ar" ? type.nameAr : type.nameEn}
          </option>
        ))}
      </select>
      <input name="titleAr" required placeholder={t("titleAr")} className="border border-line p-2" />
      <input name="titleEn" required placeholder={t("titleEn")} className="border border-line p-2" />
      <textarea name="descriptionAr" rows={2} className="border border-line p-2" />
      <textarea name="descriptionEn" rows={2} className="border border-line p-2" />
      <button
        type="submit"
        disabled={pending}
        className="w-fit border border-navy bg-navy px-4 py-2 text-surface"
      >
        {t("submit")}
      </button>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </form>
  );
}
