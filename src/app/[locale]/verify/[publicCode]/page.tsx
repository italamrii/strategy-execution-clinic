import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { verifyPublicCode } from "@/modules/credentials";
import { CredentialError } from "@/modules/credentials/errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; publicCode: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, publicCode } = await params;
  const locale = requireLocale(localeParam);
  const t = await getTranslations({ locale, namespace: "credential" });
  let dto = null;
  try {
    dto = await verifyPublicCode({ publicCode, locale, ip: null, skipRateLimit: true });
  } catch {
    return { title: t("verifyFailedTitle") };
  }
  if (!dto) {
    return { title: t("verifyFailedTitle"), description: t("verifyFailedBody") };
  }
  const name = locale === "ar" ? dto.displayNameAr : dto.displayNameEn ?? dto.displayNameAr;
  const typeName =
    locale === "ar" ? dto.membershipTypeNameAr : dto.membershipTypeNameEn;
  const title = dto.verified ? t("verifiedTitle") : t("notVerifiedTitle");
  const description = `${name} · ${typeName} · ${dto.publicCode}`;
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const canonical = `${base.replace(/\/$/, "")}/${locale}/verify/${encodeURIComponent(dto.publicCode)}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      locale: locale === "ar" ? "ar_SA" : "en_US",
      type: "profile",
    },
  };
}

export default async function VerifyCredentialPage({
  params,
}: {
  params: Promise<{ locale: string; publicCode: string }>;
}) {
  const { locale: localeParam, publicCode } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("credential");

  let dto = null;
  try {
    dto = await verifyPublicCode({
      publicCode,
      locale,
      ip: null,
    });
  } catch (error) {
    if (error instanceof CredentialError && error.code === "rate_limited") {
      return (
        <main className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="text-2xl text-ink">{t("rateLimited")}</h1>
        </main>
      );
    }
    throw error;
  }

  if (!dto) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-3xl text-ink">{t("verifyFailedTitle")}</h1>
        <p className="mt-4 text-graphite">{t("verifyFailedBody")}</p>
      </main>
    );
  }

  const statusKey =
    dto.status === "ACTIVE"
      ? "statusActive"
      : dto.status === "SUSPENDED"
        ? "statusSuspended"
        : dto.status === "EXPIRED"
          ? "statusExpired"
          : "statusRevoked";

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm tracking-[0.18em] text-gold-deep">
        {locale === "ar" ? "عيادة الاستراتيجية والتنفيذ" : "Strategy & Execution Clinic"}
      </p>
      <h1 className="mt-6 text-3xl text-ink">
        {dto.verified ? t("verifiedTitle") : t("notVerifiedTitle")}
      </h1>
      <dl className="mt-10 space-y-4 border border-line bg-surface p-8 text-sm">
        <div>
          <dt className="text-muted">{t("status")}</dt>
          <dd className="mt-1 text-lg text-ink">{t(statusKey)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("memberName")}</dt>
          <dd className="mt-1 text-ink">
            {locale === "ar" ? dto.displayNameAr : dto.displayNameEn ?? dto.displayNameAr}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("membershipType")}</dt>
          <dd className="mt-1 text-ink">
            {locale === "ar" ? dto.membershipTypeNameAr : dto.membershipTypeNameEn}
          </dd>
        </div>
        {dto.tracks[0] ? (
          <div>
            <dt className="text-muted">{t("track")}</dt>
            <dd className="mt-1 text-ink">
              {locale === "ar" ? dto.tracks[0].nameAr : dto.tracks[0].nameEn}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted">{t("memberSince")}</dt>
          <dd className="numeric mt-1 text-ink">{dto.memberSinceYear}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("publicCode")}</dt>
          <dd className="numeric mt-1 text-ink">{dto.publicCode}</dd>
        </div>
      </dl>
      <div className="mt-8 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/verify/${encodeURIComponent(dto.publicCode)}/qr?locale=${locale}`}
          alt={t("qrAlt")}
          width={160}
          height={160}
          className="border border-line bg-white p-2"
        />
      </div>
    </main>
  );
}
