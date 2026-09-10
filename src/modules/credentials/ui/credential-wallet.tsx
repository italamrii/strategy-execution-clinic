"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { OwnCredentialDto } from "@/modules/credentials";
import { CredentialCardStage } from "./credential-card-stage";
import { TrackIdentityBadges } from "@/modules/tracks/ui/track-identity-badges";

export function StaticMembershipCard({
  credential,
  locale,
}: {
  credential: OwnCredentialDto;
  locale: "ar" | "en";
}) {
  const t = useTranslations("credential");
  const typeName =
    locale === "ar" ? credential.membershipTypeAr : credential.membershipTypeEn;
  const track = credential.primaryTrack ?? credential.tracks[0];
  const trackName = track
    ? locale === "ar"
      ? track.nameAr
      : track.nameEn
    : null;

  const issued = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
  }).format(new Date(credential.issuedAt));
  const expiry = credential.expiresAt
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" }).format(
        new Date(credential.expiresAt),
      )
    : t("noExpiry");

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <article
        className="membership-card-preview membership-card-live"
        aria-label={t("cardLabel")}
        data-testid="membership-card"
        data-credential-id={credential.id}
      >
        <div className="membership-card-preview__top">
          <span className="monogram">SEC</span>
          <span>{typeName}</span>
        </div>
        <div className="membership-card-preview__body">
          <p className="membership-card-preview__brand">
            {locale === "ar" ? "عيادة الاستراتيجية والتنفيذ" : "Strategy & Execution Clinic"}
          </p>
          <strong>
            {locale === "ar"
              ? credential.memberNameAr
              : credential.memberNameEn ?? credential.memberNameAr}
          </strong>
          {trackName ? <p>{trackName}</p> : null}
          {credential.isGroupLeader ? (
            <p className="mt-2 text-xs tracking-[0.18em]">{t("leaderBadge")}</p>
          ) : null}
          <p className="numeric mt-4" data-testid="public-code">
            {credential.publicCode}
          </p>
          <p className="mt-2 text-xs opacity-80">
            {t("issuedAt")}: {issued}
          </p>
          <p className="mt-1 text-xs opacity-80">
            {t("expiresAt")}: {expiry}
          </p>
          <p className="mt-2 text-xs">{t(
            credential.effectiveStatus === "active"
              ? "statusActive"
              : credential.effectiveStatus === "suspended"
                ? "statusSuspended"
                : credential.effectiveStatus === "expired"
                  ? "statusExpired"
                  : "statusRevoked",
          )}</p>
        </div>
      </article>
      <TrackIdentityBadges
        locale={locale}
        primaryTrack={
          credential.primaryTrack
            ? { ...credential.primaryTrack, role: "primary" }
            : null
        }
        isGroupLeader={credential.isGroupLeader}
        tracks={credential.tracks}
      />
    </div>
  );
}

export function CredentialWallet({
  credentials,
  locale,
}: {
  credentials: OwnCredentialDto[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("credential");
  const [activeId, setActiveId] = useState(credentials[0]?.id ?? "");
  const active = useMemo(
    () => credentials.find((c) => c.id === activeId) ?? credentials[0],
    [activeId, credentials],
  );

  if (!active) {
    return <p className="text-graphite">{t("empty")}</p>;
  }

  const verifyUrl = locale === "ar" ? active.verificationUrlAr : active.verificationUrlEn;

  return (
    <div className="space-y-8">
      {credentials.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {credentials.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={
                item.id === active.id
                  ? "border border-gold bg-surface px-3 py-2 text-sm text-navy"
                  : "border border-line px-3 py-2 text-sm text-graphite"
              }
            >
              {locale === "ar" ? item.membershipTypeAr : item.membershipTypeEn}
            </button>
          ))}
        </div>
      ) : null}

      <CredentialCardStage credential={active} locale={locale} />

      <div className="flex flex-col items-center gap-3 border border-line bg-surface p-6">
        <p className="text-sm text-muted">{t("qrLabel")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/verify/${encodeURIComponent(active.publicCode)}/qr?locale=${locale}`}
          alt={t("qrAlt")}
          width={200}
          height={200}
          className="border border-line bg-white p-2"
          data-testid="credential-qr"
        />
        <p className="text-xs text-muted">{t("qrHint")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/credentials/${active.id}/export/png?locale=${locale}`}
          className="inline-flex min-h-11 items-center bg-navy px-4 text-sm text-surface"
        >
          {t("downloadPng")}
        </a>
        <a
          href={`/api/credentials/${active.id}/export/pdf?locale=${locale}`}
          className="inline-flex min-h-11 items-center border border-line px-4 text-sm text-ink"
        >
          {t("downloadPdf")}
        </a>
        <a
          href={`/api/credentials/${active.id}/export/pdf?locale=${locale}&variant=certificate`}
          className="inline-flex min-h-11 items-center border border-line px-4 text-sm text-ink"
        >
          {t("downloadCertificate")}
        </a>
      </div>

      <div className="border border-line bg-surface p-6">
        <p className="text-sm text-muted">{t("verificationLink")}</p>
        <p className="numeric mt-2 break-all text-sm text-ink">{verifyUrl}</p>
        <button
          type="button"
          className="mt-4 text-sm text-navy"
          onClick={() => navigator.clipboard.writeText(verifyUrl)}
        >
          {t("copyLink")}
        </button>
      </div>

      <ShareKit credential={active} locale={locale} />
    </div>
  );
}

function ShareKit({
  credential,
  locale,
}: {
  credential: OwnCredentialDto;
  locale: "ar" | "en";
}) {
  const t = useTranslations("credential");
  const verifyUrl = locale === "ar" ? credential.verificationUrlAr : credential.verificationUrlEn;
  const typeName =
    locale === "ar" ? credential.membershipTypeAr : credential.membershipTypeEn;
  const track = credential.primaryTrack ?? credential.tracks[0];
  const trackName = track ? (locale === "ar" ? track.nameAr : track.nameEn) : "";
  const caption =
    locale === "ar"
      ? `يسعدني الانضمام إلى عيادة الاستراتيجية والتنفيذ كـ ${typeName}${trackName ? ` ضمن مسار ${trackName}` : ""}${credential.isGroupLeader ? " · قائد المسار" : ""}.\n\n#عيادة_الاستراتيجية_والتنفيذ`
      : `I'm pleased to join Strategy & Execution Clinic as ${typeName}${trackName ? ` in the ${trackName} track` : ""}${credential.isGroupLeader ? " · Group Leader" : ""}.\n\n#StrategyExecutionClinic`;

  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;

  return (
    <section className="border border-line bg-canvas p-6">
      <h2 className="text-lg text-ink">{t("shareTitle")}</h2>
      <textarea
        readOnly
        className="mt-4 w-full border border-line bg-surface p-3 text-sm text-graphite"
        rows={5}
        value={caption}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="border border-line px-4 py-2 text-sm"
          onClick={() => navigator.clipboard.writeText(caption)}
        >
          {t("copyCaption")}
        </button>
        <a href={linkedIn} target="_blank" rel="noreferrer" className="bg-navy px-4 py-2 text-sm text-surface">
          {t("shareLinkedIn")}
        </a>
        <a
          href={`/api/credentials/${credential.id}/export/png?locale=${locale}&variant=square`}
          className="border border-line px-4 py-2 text-sm"
        >
          {t("downloadSquare")}
        </a>
      </div>
    </section>
  );
}
