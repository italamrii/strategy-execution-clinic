"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { TRACK_CONTRIBUTION_TYPES } from "@/modules/tracks/catalog";
import { createTrackContributionAction } from "@/modules/tracks/actions";

export function TrackContributionForm({ trackId }: { trackId: string }) {
  const t = useTranslations("tracks");
  const router = useRouter();
  type ContributionTypeSlug = (typeof TRACK_CONTRIBUTION_TYPES)[number]["slug"];
  const [contributionType, setContributionType] = useState<ContributionTypeSlug>(
    TRACK_CONTRIBUTION_TYPES[0].slug,
  );
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [summaryAr, setSummaryAr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 border border-line bg-surface p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createTrackContributionAction({
            trackId,
            contributionType,
            titleAr,
            titleEn: titleEn || titleAr,
            summaryAr,
            submit: true,
          });
          if (!result.ok) {
            setError(t("errors.generic"));
            return;
          }
          setTitleAr("");
          setTitleEn("");
          setSummaryAr("");
          router.refresh();
        });
      }}
    >
      <h3 className="text-lg text-navy">{t("submitContribution")}</h3>
      <label className="grid gap-2 text-sm">
        <span>{t("contributionType")}</span>
        <select
          className="border border-line bg-canvas px-3 py-2"
          value={contributionType}
          onChange={(event) => setContributionType(event.target.value as ContributionTypeSlug)}
          disabled={pending}
        >
          {TRACK_CONTRIBUTION_TYPES.map((type) => (
            <option key={type.slug} value={type.slug}>
              {type.nameEn} / {type.nameAr}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm">
        <span>{t("titleAr")}</span>
        <input
          className="border border-line bg-canvas px-3 py-2"
          value={titleAr}
          onChange={(event) => setTitleAr(event.target.value)}
          required
          disabled={pending}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span>{t("titleEn")}</span>
        <input
          className="border border-line bg-canvas px-3 py-2"
          value={titleEn}
          onChange={(event) => setTitleEn(event.target.value)}
          disabled={pending}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span>{t("summary")}</span>
        <textarea
          className="min-h-24 border border-line bg-canvas px-3 py-2"
          value={summaryAr}
          onChange={(event) => setSummaryAr(event.target.value)}
          disabled={pending}
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
