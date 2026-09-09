import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { listDirectoryMembers } from "@/modules/recognition";
import { RateLimitError } from "@/modules/identity";

export const dynamic = "force-dynamic";

export default async function MembersDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("recognition");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const headerList = await headers();
  const clientKey = headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? "anon";
  let items: Awaited<ReturnType<typeof listDirectoryMembers>>["items"] = [];
  try {
    const listed = await listDirectoryMembers({ q, page: 1, pageSize: 24, clientKey });
    items = listed.items;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return (
        <main className="mx-auto max-w-6xl px-6 py-24">
          <h1 className="text-3xl text-ink">{t("rateLimited")}</h1>
        </main>
      );
    }
    throw error;
  }

  return (
    <main id="main" className="public-product-page members-page mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("directoryTitle")}</h1>
      <p className="mt-3 text-graphite">{t("directorySubtitle")}</p>
      <form className="mt-8 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("search")}
          className="flex-1 border border-line px-3 py-2"
        />
        <button type="submit" className="border border-navy bg-navy px-4 py-2 text-surface">
          {t("search")}
        </button>
      </form>
      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((m, idx) => (
          <li key={`${m.publicCode ?? m.displayNameAr}-${idx}`} className="border border-line bg-surface p-5">
            <h2 className="text-lg text-navy">
              {locale === "ar" ? m.displayNameAr : m.displayNameEn ?? m.displayNameAr}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {locale === "ar" ? m.headlineAr : m.headlineEn}
            </p>
            {m.primaryTrack || m.isGroupLeader ? (
              <p className="mt-2 text-xs text-navy">
                {m.isGroupLeader
                  ? locale === "ar"
                    ? "قائد المسار"
                    : "Group Leader"
                  : null}
                {m.isGroupLeader && m.primaryTrack ? " · " : null}
                {m.primaryTrack
                  ? locale === "ar"
                    ? m.primaryTrack.nameAr
                    : m.primaryTrack.nameEn
                  : null}
              </p>
            ) : null}
            {m.publicCode ? (
              <Link href={`/members/${m.publicCode}`} className="mt-3 inline-block text-gold-deep">
                {t("viewProfile")}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      {items.length === 0 ? <p className="mt-10 text-muted">{t("directoryEmpty")}</p> : null}
    </main>
  );
}
