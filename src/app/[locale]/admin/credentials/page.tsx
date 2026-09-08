import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { listCredentialsForAdmin } from "@/modules/credentials";

export default async function AdminCredentialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminCredential");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="text-2xl text-ink">{t("unauthorized")}</h1>
      </main>
    );
  }
  try {
    await requireAuthenticatedPermission("credential.read.any");
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
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const result = await listCredentialsForAdmin({
    actorUserId: auth.userId,
    status,
    q,
    page: 1,
    pageSize: 20,
  });

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <form className="mt-8 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("search")}
          className="border border-line px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status ?? ""} className="border border-line px-3 py-2 text-sm">
          <option value="">—</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
          <option value="revoked">revoked</option>
          <option value="expired">expired</option>
        </select>
        <button type="submit" className="bg-navy px-4 py-2 text-sm text-surface">
          {t("search")}
        </button>
      </form>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-start text-muted">
              <th className="px-3 py-3">{t("publicCode")}</th>
              <th className="px-3 py-3">{t("status")}</th>
              <th className="px-3 py-3">{t("issuedAt")}</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.id} className="border-b border-line">
                <td className="numeric px-3 py-3 text-ink">
                  <Link href={`/admin/credentials/${item.id}`} className="text-navy hover:underline">
                    {item.publicCode}
                  </Link>
                </td>
                <td className="px-3 py-3 text-ink">{item.status}</td>
                <td className="numeric px-3 py-3 text-ink">
                  {item.issuedAt.toLocaleDateString(locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
