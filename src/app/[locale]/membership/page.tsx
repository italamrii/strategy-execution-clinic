import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import {
  listPublicMembershipTypes,
  listPublicTracks,
  toPublicMembershipTypeDto,
  toMembershipTypeDto,
  toTrackDto,
} from "@/modules/membership";
import { getOptionalAuthContext } from "@/modules/identity";

export const dynamic = "force-dynamic";

export default async function MembershipLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("membership");
  const auth = await getOptionalAuthContext().catch(() => null);

  const [typeRows, trackRows] = await Promise.all([
    listPublicMembershipTypes(),
    listPublicTracks(),
  ]);
  const types = typeRows
    .filter((row) => row.visibility === "public")
    .map((row) => toPublicMembershipTypeDto(toMembershipTypeDto(row)));
  const tracks = trackRows.map(toTrackDto);
  const volunteer = types.find((type) => type.slug === "volunteer_member");

  return (
    <main id="main" className="public-product-page membership-page mx-auto max-w-6xl px-6 py-16">
      <section className="max-w-3xl">
        <p className="text-sm tracking-[0.18em] text-gold-deep">{t("eyebrow")}</p>
        <h1 className="mt-6 text-4xl leading-tight text-ink md:text-5xl">{t("headline")}</h1>
        <p className="mt-6 text-lg leading-relaxed text-graphite">{t("lede")}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={auth ? "/membership/apply" : "/login"}
            className="inline-flex min-h-11 items-center bg-navy px-5 text-sm text-surface"
          >
            {t("ctaApply")}
          </Link>
          {auth ? (
            <Link
              href="/account/membership"
              className="inline-flex min-h-11 items-center border border-line-strong px-5 text-sm text-ink"
            >
              {t("ctaAccount")}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mt-24 max-w-3xl">
        <h2 className="text-3xl text-ink">{t("meaningTitle")}</h2>
        <p className="mt-4 text-lg leading-relaxed text-graphite">{t("meaningBody")}</p>
      </section>

      <section className="mt-24">
        <h2 className="text-3xl text-ink">{t("categoriesTitle")}</h2>
        <p className="mt-4 max-w-3xl text-graphite">{t("categoriesBody")}</p>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {types.map((type) => (
            <li key={type.id} className="border border-line bg-surface px-5 py-5">
              <p className="text-ink">{locale === "ar" ? type.nameAr : type.nameEn}</p>
              <p className="mt-1 text-sm text-muted">
                {locale === "ar" ? type.nameEn : type.nameAr}
              </p>
              <p className="mt-4 text-xs text-gold-deep">
                {type.invitationOnly
                  ? t("invitationOnly")
                  : type.applicationsOpen
                    ? t("applicationsOpen")
                    : t("applicationsClosed")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-24">
        <h2 className="text-3xl text-ink">{t("tracksTitle")}</h2>
        <p className="mt-4 max-w-3xl text-graphite">{t("tracksBody")}</p>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {tracks.map((track) => (
            <li key={track.id} className="border border-line bg-surface px-5 py-4 text-ink">
              {locale === "ar" ? track.nameAr : track.nameEn}
            </li>
          ))}
        </ul>
      </section>

      {volunteer ? (
        <section className="mt-24 border border-gold/40 bg-canvas px-8 py-10">
          <h2 className="text-3xl text-ink">{t("volunteerTitle")}</h2>
          <p className="mt-4 max-w-3xl text-lg text-graphite">{t("volunteerBody")}</p>
          <p className="mt-6 text-xl text-navy">
            {locale === "ar" ? volunteer.nameAr : volunteer.nameEn}
          </p>
        </section>
      ) : null}

      <section className="mt-24 max-w-3xl">
        <h2 className="text-3xl text-ink">{t("howTitle")}</h2>
        <ol className="mt-8 space-y-4 text-graphite">
          <li>1. {t("howStep1")}</li>
          <li>2. {t("howStep2")}</li>
          <li>3. {t("howStep3")}</li>
          <li>4. {t("howStep4")}</li>
        </ol>
        <Link
          href={auth ? "/membership/apply" : "/login"}
          className="mt-10 inline-flex min-h-11 items-center bg-navy px-5 text-sm text-surface"
        >
          {t("ctaApply")}
        </Link>
      </section>
    </main>
  );
}
