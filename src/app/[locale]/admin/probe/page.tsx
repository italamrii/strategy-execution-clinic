import { setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";

export default async function AdminProbePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);

  const auth = await getOptionalAuthContext();
  if (!auth) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-2xl text-ink">Unauthorized</h1>
      </main>
    );
  }

  let allowed = false;
  try {
    await requireAuthenticatedPermission("admin.dashboard.read");
    allowed = true;
  } catch (error) {
    if (!(error instanceof AuthorizationError)) {
      throw error;
    }
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-2xl text-ink">Forbidden</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-2xl text-ink">Admin probe OK</h1>
      <p className="mt-3 text-graphite">Permission admin.dashboard.read granted.</p>
    </main>
  );
}
