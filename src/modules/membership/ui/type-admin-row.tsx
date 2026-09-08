"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateMembershipTypeAction } from "@/modules/membership/actions";
import type { MembershipTypeDto } from "@/modules/membership/dto";

export function TypeAdminRow({
  type,
  locale,
}: {
  type: MembershipTypeDto;
  locale: "ar" | "en";
}) {
  const t = useTranslations("adminMembership");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 border border-line bg-surface p-5 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          await updateMembershipTypeAction({
            typeId: type.id,
            isEnabled: form.get("isEnabled") === "on",
            applicationsOpen: form.get("applicationsOpen") === "on",
            invitationOnly: form.get("invitationOnly") === "on",
            sortOrder: Number(form.get("sortOrder") ?? type.sortOrder),
          });
          router.refresh();
        });
      }}
    >
      <div>
        <p className="text-ink">{locale === "ar" ? type.nameAr : type.nameEn}</p>
        <p className="text-sm text-muted">{type.slug}</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="isEnabled" type="checkbox" defaultChecked={type.isEnabled} />
        {t("enabled")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="applicationsOpen" type="checkbox" defaultChecked={type.applicationsOpen} />
        {t("applicationsOpen")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="invitationOnly" type="checkbox" defaultChecked={type.invitationOnly} />
        {t("invitationOnly")}
      </label>
      <label className="text-sm">
        Sort
        <input
          name="sortOrder"
          type="number"
          defaultValue={type.sortOrder}
          className="ms-2 w-20 border border-line px-2 py-1"
        />
      </label>
      <button type="submit" disabled={pending} className="bg-navy px-4 py-2 text-sm text-surface md:w-fit">
        {t("saveType")}
      </button>
    </form>
  );
}
