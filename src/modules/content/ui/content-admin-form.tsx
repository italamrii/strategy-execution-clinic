"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateContentBlockAction } from "@/modules/content/actions";

type Block = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  status: string;
};

export function ContentAdminForm({ blocks }: { blocks: Block[] }) {
  const t = useTranslations("adminContent");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mt-10 space-y-6">
      {blocks.map((block) => (
        <form
          key={block.id}
          className="border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const result = await updateContentBlockAction({
                blockId: block.id,
                titleAr: String(fd.get("titleAr")),
                titleEn: String(fd.get("titleEn")),
                bodyAr: String(fd.get("bodyAr")),
                bodyEn: String(fd.get("bodyEn")),
                status: String(fd.get("status")) as "draft" | "published",
              });
              setMessage(result.ok ? t("saved") : t("failed"));
            });
          }}
        >
          <p className="font-mono text-sm text-muted">{block.slug}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input name="titleAr" defaultValue={block.titleAr} className="border border-line p-2" dir="rtl" />
            <input name="titleEn" defaultValue={block.titleEn} className="border border-line p-2" />
            <textarea name="bodyAr" defaultValue={block.bodyAr} className="border border-line p-2 md:col-span-1" dir="rtl" rows={4} />
            <textarea name="bodyEn" defaultValue={block.bodyEn} className="border border-line p-2 md:col-span-1" rows={4} />
            <select name="status" defaultValue={block.status} className="border border-line p-2">
              <option value="draft">{t("draft")}</option>
              <option value="published">{t("published")}</option>
            </select>
          </div>
          <button type="submit" disabled={pending} className="mt-3 border border-navy bg-navy px-4 py-2 text-surface">
            {t("save")}
          </button>
        </form>
      ))}
      {message ? <p className="text-sm text-navy">{message}</p> : null}
    </div>
  );
}
