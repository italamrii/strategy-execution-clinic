"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createApplicationAction } from "@/modules/membership/actions";
import type { PublicMembershipTypeDto, TrackDto } from "@/modules/membership/dto";

export function ApplicationForm({
  types,
  tracks,
  locale,
}: {
  types: PublicMembershipTypeDto[];
  tracks: TrackDto[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("membership");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const eligible = useMemo(
    () => types.filter((type) => type.applicationsOpen && !type.invitationOnly),
    [types],
  );

  if (eligible.length === 0) {
    return <p className="text-graphite">{t("noEligibleTypes")}</p>;
  }
  if (done) {
    return <p className="mt-10 border border-line bg-surface p-6 text-ink" role="status">{t("submittedConfirm")}</p>;
  }

  function toggleTrack(id: string) {
    setSelectedTracks((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <form
      className="mt-10 max-w-2xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await createApplicationAction({
            membershipTypeId: String(form.get("membershipTypeId") ?? ""),
            trackIds: selectedTracks,
            headline: String(form.get("headline") ?? ""),
            summary: String(form.get("summary") ?? ""),
            motivation: String(form.get("motivation") ?? ""),
            experience: String(form.get("experience") ?? ""),
            linkedinUrl: String(form.get("linkedinUrl") ?? "") || undefined,
            portfolioUrl: String(form.get("portfolioUrl") ?? "") || undefined,
            githubUrl: String(form.get("githubUrl") ?? "") || undefined,
            additionalNotes: String(form.get("additionalNotes") ?? "") || undefined,
          });
          if (!result.ok) {
            const known = [
              "invalid_input",
              "forbidden",
              "invitation_only",
              "membership_type_inactive",
              "applications_closed",
              "open_application_exists",
              "active_membership_exists",
              "self_approval_forbidden",
              "reason_required",
            ] as const;
            const code = known.includes(result.code as (typeof known)[number])
              ? (result.code as (typeof known)[number])
              : "generic";
            setError(t(`errors.${code}`));
            return;
          }
          setError(null);
          setDone(true);
          window.setTimeout(() => {
            router.push("/account/membership");
            router.refresh();
          }, 1200);
        });
      }}
    >
      <label className="block space-y-2 text-sm">
        <span className="text-muted">{t("typeLabel")}</span>
        <select
          name="membershipTypeId"
          required
          className="w-full border border-line bg-surface px-3 py-3 text-ink"
          defaultValue={eligible.find((t) => t.slug === "professional_member")?.id ?? eligible[0]?.id}
        >
          {eligible.map((type) => (
            <option key={type.id} value={type.id}>
              {locale === "ar" ? type.nameAr : type.nameEn}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm text-muted">{t("tracksLabel")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {tracks.map((track) => (
            <label key={track.id} className="flex items-start gap-2 border border-line px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={selectedTracks.includes(track.id)}
                onChange={() => toggleTrack(track.id)}
              />
              <span>{locale === "ar" ? track.nameAr : track.nameEn}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {(
        [
          ["headline", "headlineLabel"],
          ["summary", "summaryLabel"],
          ["motivation", "motivationLabel"],
          ["experience", "experienceLabel"],
        ] as const
      ).map(([name, label]) => (
        <label key={name} className="block space-y-2 text-sm">
          <span className="text-muted">{t(label)}</span>
          {name === "headline" ? (
            <input
              name={name}
              required
              className="w-full border border-line bg-surface px-3 py-3 text-ink"
            />
          ) : (
            <textarea
              name={name}
              required
              rows={4}
              className="w-full border border-line bg-surface px-3 py-3 text-ink"
            />
          )}
        </label>
      ))}

      {(
        [
          ["linkedinUrl", "linkedinLabel"],
          ["portfolioUrl", "portfolioLabel"],
          ["githubUrl", "githubLabel"],
        ] as const
      ).map(([name, label]) => (
        <label key={name} className="block space-y-2 text-sm">
          <span className="text-muted">{t(label)}</span>
          <input
            name={name}
            type="url"
            className="w-full border border-line bg-surface px-3 py-3 text-ink"
          />
        </label>
      ))}

      <label className="block space-y-2 text-sm">
        <span className="text-muted">{t("notesLabel")}</span>
        <textarea name="additionalNotes" rows={3} className="w-full border border-line bg-surface px-3 py-3 text-ink" />
      </label>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center bg-navy px-5 text-sm text-surface disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
