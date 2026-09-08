"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { issueDirectAction } from "@/modules/membership/actions";
import type { MembershipTypeDto, TrackDto } from "@/modules/membership/dto";

export function DirectIssueForm({
  types,
  tracks,
  locale,
}: {
  types: MembershipTypeDto[];
  tracks: TrackDto[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("adminMembership");
  const [pending, startTransition] = useTransition();
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-8 max-w-xl space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        setError(null);
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await issueDirectAction({
            targetUserId: String(form.get("targetUserId") ?? ""),
            membershipTypeId: String(form.get("membershipTypeId") ?? ""),
            trackIds: selectedTracks,
            reason: String(form.get("reason") ?? ""),
          });
          if (!result.ok) {
            setError(result.code);
            return;
          }
          setMessage(t("issued"));
        });
      }}
    >
      <label className="block space-y-2 text-sm">
        <span className="text-muted">{t("targetUserId")}</span>
        <input name="targetUserId" required className="w-full border border-line px-3 py-3" />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-muted">{t("filterType")}</span>
        <select name="membershipTypeId" required className="w-full border border-line px-3 py-3">
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {locale === "ar" ? type.nameAr : type.nameEn}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm text-muted">{t("filterTrack")}</legend>
        {tracks.map((track) => (
          <label key={track.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedTracks.includes(track.id)}
              onChange={() =>
                setSelectedTracks((current) =>
                  current.includes(track.id)
                    ? current.filter((id) => id !== track.id)
                    : [...current, track.id],
                )
              }
            />
            {locale === "ar" ? track.nameAr : track.nameEn}
          </label>
        ))}
      </fieldset>
      <label className="block space-y-2 text-sm">
        <span className="text-muted">{t("issueReason")}</span>
        <textarea name="reason" required rows={4} className="w-full border border-line px-3 py-3" />
      </label>
      <button type="submit" disabled={pending} className="bg-navy px-5 py-3 text-sm text-surface">
        {t("issueSubmit")}
      </button>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
