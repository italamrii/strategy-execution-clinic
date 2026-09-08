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
    dto = await verifyPublicCode({ publicCode, locale, ip: null });
  } catch {
    return { title: t("verifyFailedTitle") };
  }
  if (!dto) {
    return { title: t("verifyFailedTitle") };
  }
  const name = locale === "ar" ? dto.displayNameAr : dto.displayNameEn ?? dto.displayNameAr;
  return {
    title: `${name} · ${t("publicProfileTitle")}`,
    description: dto.publicCode,
  };
}

export default async function PublicMemberPage({
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
    dto = await verifyPublicCode({ publicCode, locale, ip: null });
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
        {locale === "ar" ? dto.displayNameAr : dto.displayNameEn ?? dto.displayNameAr}
      </h1>
      <p className="mt-2 text-graphite">
        {locale === "ar" ? dto.membershipTypeNameAr : dto.membershipTypeNameEn}
      </p>
      <dl className="mt-10 space-y-4 border border-line bg-surface p-8 text-sm">
        <div>
          <dt className="text-muted">{t("status")}</dt>
          <dd className="mt-1 text-lg text-ink">{t(statusKey)}</dd>
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
          <dt className="text-muted">{t("publicCode")}</dt>
          <dd className="numeric mt-1 text-ink">{dto.publicCode}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-muted">
        <a href={`/${locale}/verify/${dto.publicCode}`} className="text-navy hover:underline">
          {t("viewVerification")}
        </a>
      </p>
    </main>
  );
}
