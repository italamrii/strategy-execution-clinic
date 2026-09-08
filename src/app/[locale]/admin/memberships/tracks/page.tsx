import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listAllTracks, toTrackDto } from "@/modules/membership";
import { AdminMembershipNav } from "@/modules/membership/ui/admin-nav";
import { TrackAdminRow } from "@/modules/membership/ui/track-admin-row";

export default async function AdminTracksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminMembership");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="text-2xl text-ink">{t("unauthorized")}</h1>
      </main>
    );
  }
  try {
    await requireAuthenticatedPermission("membership.track.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <main className="mx-auto max-w-6xl px-6 py-24">
          <h1 className="text-2xl text-ink">{t("forbidden")}</h1>
        </main>
      );
    }
    throw error;
  }

  const tracks = (await listAllTracks()).map(toTrackDto);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("tracks")}</h1>
      <AdminMembershipNav active="tracks" />
      <div className="mt-10 space-y-4">
        {tracks.map((track) => (
          <TrackAdminRow key={track.id} track={track} locale={locale} />
        ))}
      </div>
    </main>
  );
}
