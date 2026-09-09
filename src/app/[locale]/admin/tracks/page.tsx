import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import {
  listPublicOperatingTracks,
  listTrackApplicationsForAdmin,
} from "@/modules/tracks";
import { AdminTrackControls } from "@/modules/tracks/ui/admin-track-controls";

export const dynamic = "force-dynamic";

export default async function AdminTracksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("tracks");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <AccessDenied status="unauthenticated" />;
  }
  try {
    await requireAuthenticatedPermission("track.manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }
  const [tracks, applications] = await Promise.all([
    listPublicOperatingTracks(),
    listTrackApplicationsForAdmin(auth.userId),
  ]);
  const isAr = locale === "ar";

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("adminTitle")}</h1>
      
      <section className="mt-10 space-y-4">
        {tracks.map((track) => (
          <AdminTrackControls
            key={track.id}
            track={{
              id: track.id,
              code: track.code,
              name: isAr ? track.nameAr : track.nameEn,
              status: track.status,
              applicationsOpen: track.applicationsOpen,
              allowSecondary: track.allowSecondary,
              maxSecondary: track.maxSecondary,
            }}
          />
        ))}
      </section>
      <section className="mt-12">
        <h2 className="text-2xl text-navy">{t("applications")}</h2>
        <p className="mt-2 text-sm text-muted">
          {t("pendingApplicationsCount", { count: applications.filter((a) => a.status === "submitted" || a.status === "under_review").length })}
        </p>
      </section>
    </main>
  );
}
