import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import {
  listAllMembershipTypes,
  listAllTracks,
  listApplicationsForAdmin,
} from "@/modules/membership";
import { AdminMembershipNav } from "@/modules/membership/ui/admin-nav";

export default async function AdminApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
    await requireAuthenticatedPermission("membership.application.read.any");
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

  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const membershipTypeId =
    typeof sp.type === "string" ? sp.type : undefined;
  const trackId = typeof sp.track === "string" ? sp.track : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const [result, types, tracks] = await Promise.all([
    listApplicationsForAdmin({
      actorUserId: auth.userId,
      status,
      membershipTypeId,
      trackId,
      q,
      page: 1,
      pageSize: 20,
    }),
    listAllMembershipTypes(),
    listAllTracks(),
  ]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("applications")}</h1>
      <AdminMembershipNav active="applications" />

      <form className="mt-8 grid gap-3 border border-line bg-surface p-4 md:grid-cols-4">
        <label className="text-sm">
          <span className="text-muted">{t("filterStatus")}</span>
          <select name="status" defaultValue={status ?? ""} className="mt-1 w-full border border-line px-2 py-2">
            <option value="">—</option>
            {["submitted", "under_review", "changes_requested", "approved", "rejected", "withdrawn"].map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">{t("filterType")}</span>
          <select name="type" defaultValue={membershipTypeId ?? ""} className="mt-1 w-full border border-line px-2 py-2">
            <option value="">—</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {locale === "ar" ? type.nameAr : type.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">{t("filterTrack")}</span>
          <select name="track" defaultValue={trackId ?? ""} className="mt-1 w-full border border-line px-2 py-2">
            <option value="">—</option>
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {locale === "ar" ? track.nameAr : track.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">{t("search")}</span>
          <input name="q" defaultValue={q ?? ""} className="mt-1 w-full border border-line px-2 py-2" />
        </label>
        <button type="submit" className="bg-navy px-4 py-2 text-sm text-surface md:col-span-4 md:w-fit">
          {t("search")}
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="mt-8 text-graphite">{t("empty")}</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-start text-muted">
                <th className="px-3 py-3 font-medium">{t("applicant")}</th>
                <th className="px-3 py-3 font-medium">{t("filterType")}</th>
                <th className="px-3 py-3 font-medium">{t("filterStatus")}</th>
                <th className="px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="border-b border-line">
                  <td className="px-3 py-3 font-mono text-xs text-ink">{item.userId.slice(0, 8)}</td>
                  <td className="px-3 py-3 text-ink">
                    {locale === "ar" ? item.membershipType.nameAr : item.membershipType.nameEn}
                  </td>
                  <td className="px-3 py-3 text-gold-deep">{item.status}</td>
                  <td className="px-3 py-3 text-end">
                    <Link
                      href={`/admin/memberships/applications/${item.id}`}
                      className="text-navy"
                    >
                      {t("open")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
