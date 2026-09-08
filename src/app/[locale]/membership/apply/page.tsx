import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import {
  listPublicMembershipTypes,
  listPublicTracks,
  toMembershipTypeDto,
  toPublicMembershipTypeDto,
  toTrackDto,
} from "@/modules/membership";
import { ApplicationForm } from "@/modules/membership/ui/application-form";

export const dynamic = "force-dynamic";

export default async function MembershipApplyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const auth = await getOptionalAuthContext();
  if (!auth) {
    redirect({ href: "/login", locale });
  }
  const t = await getTranslations("membership");
  const [typeRows, trackRows] = await Promise.all([
    listPublicMembershipTypes(),
    listPublicTracks(),
  ]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("applyTitle")}</h1>
      <p className="mt-4 max-w-2xl text-graphite">{t("applySubtitle")}</p>
      <ApplicationForm
        locale={locale}
        types={typeRows.map((row) => toPublicMembershipTypeDto(toMembershipTypeDto(row)))}
        tracks={trackRows.map(toTrackDto)}
      />
      <p className="mt-8 text-sm">
        <Link href="/membership" className="text-navy">
          {t("title")}
        </Link>
      </p>
    </main>
  );
}
