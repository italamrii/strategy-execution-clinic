import type { Locale } from "@/i18n/routing";
import type { CardRenderInput } from "./card-svg";
import { buildVerificationUrl, generateQrSvg } from "./qr";
import { effectiveCredentialStatus, type CredentialDbStatus } from "./states";
import { hydrateCredentialContext } from "./service";
import { getActiveCardTemplate } from "./templates";

export async function buildCardRenderInput(
  credentialId: string,
  locale: Locale,
  statusLabel: string,
): Promise<CardRenderInput> {
  const ctx = await hydrateCredentialContext(credentialId);
  const verificationUrl = buildVerificationUrl(ctx.credential.publicCode, locale);
  const qrSvg = await generateQrSvg(verificationUrl);
  const { getVerifiedTrackIdentity } = await import("@/modules/tracks");
  const identity = await getVerifiedTrackIdentity(ctx.membership.userId);
  const template = await getActiveCardTemplate(ctx.membership.membershipTypeId);
  const primary = identity.primaryTrack ?? ctx.trackRows[0] ?? null;
  return {
    locale,
    memberName:
      locale === "ar"
        ? ctx.profile?.displayNameAr ?? ""
        : ctx.profile?.displayNameEn ?? ctx.profile?.displayNameAr ?? "",
    membershipTypeAr: ctx.type?.nameAr ?? "",
    membershipTypeEn: ctx.type?.nameEn ?? "",
    primaryTrackAr: primary?.nameAr ?? null,
    primaryTrackEn: primary?.nameEn ?? null,
    publicCode: ctx.credential.publicCode,
    statusLabel,
    issuedYear: ctx.credential.issuedAt.getFullYear(),
    issuedAtLabel: new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" }).format(ctx.credential.issuedAt),
    expiresAtLabel: (ctx.credential.expiresAt ?? ctx.membership.endsAt)
      ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" }).format(
          ctx.credential.expiresAt ?? ctx.membership.endsAt!,
        )
      : undefined,
    typeSlug: ctx.type?.slug ?? "professional_member",
    qrSvg,
    showPhoto: ctx.profile?.visibility === "public",
    photoDataUrl: null,
    design: template?.config ?? null,
    isGroupLeader: identity.isGroupLeader,
  };
}

export async function buildCardRenderInputForCredential(
  credentialId: string,
  locale: Locale,
  t: (key: string) => string,
) {
  const ctx = await hydrateCredentialContext(credentialId);
  const effective = effectiveCredentialStatus({
    credentialStatus: ctx.credential.status as CredentialDbStatus,
    membershipStatus: ctx.membership.status,
    expiresAt: ctx.credential.expiresAt ?? ctx.membership.endsAt,
  });
  const statusKey =
    effective === "active"
      ? "statusActive"
      : effective === "suspended"
        ? "statusSuspended"
        : effective === "expired"
          ? "statusExpired"
          : "statusRevoked";
  return buildCardRenderInput(credentialId, locale, t(statusKey));
}
