import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { listPublicOperatingTracks } from "@/modules/tracks";

export const dynamic = "force-dynamic";

export default async function TracksDirectoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("tracks");
  const tracks = await listPublicOperatingTracks();
  const isAr = locale === "ar";

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">SEC · TRACKS</p>
      <h1 className="mt-3 text-4xl text-ink">{t("directoryTitle")}</h1>
      <p className="mt-4 max-w-3xl text-graphite">{t("directoryBody")}</p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {tracks.map((track) => (
          <Link
            key={track.id}
            href={`/tracks/${track.slug}`}
            className="border border-line bg-surface p-6 transition hover:border-gold"
          >
            <p className="numeric text-sm text-muted">{track.code}</p>
            <h2 className="mt-2 text-2xl text-navy">
              {isAr ? track.nameAr : track.nameEn}
            </h2>
            <p className="mt-3 text-sm text-graphite">
              {isAr ? track.descriptionAr : track.descriptionEn}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
