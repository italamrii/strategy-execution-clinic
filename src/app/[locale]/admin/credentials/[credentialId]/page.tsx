import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { AccessDenied } from "@/shared/ui/access-denied";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import {
  getCredentialForAdmin,
  getCredentialStatusHistory,
} from "@/modules/credentials";
import { AdminCredentialActions } from "@/modules/credentials/ui/admin-credential-actions";

export default async function AdminCredentialDetailPage({
  params,
}: {
  params: Promise<{ locale: string; credentialId: string }>;
}) {
  const { locale: localeParam, credentialId } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminCredential");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <AccessDenied status="unauthenticated" />;
  }
  try {
    await requireAuthenticatedPermission("credential.read.any");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <AccessDenied status="forbidden" email={auth.email} />;
    }
    throw error;
  }

  const [credential, history] = await Promise.all([
    getCredentialForAdmin({ actorUserId: auth.userId, credentialId }),
    getCredentialStatusHistory({ actorUserId: auth.userId, credentialId }),
  ]);

  const verifyUrl = locale === "ar" ? credential.verificationUrlAr : credential.verificationUrlEn;

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/admin/credentials" className="text-sm text-graphite hover:text-navy">
        ← {t("title")}
      </Link>
      <h1 className="mt-6 text-4xl text-ink">{credential.publicCode}</h1>
      <dl className="mt-8 grid gap-4 border border-line bg-surface p-8 text-sm md:grid-cols-2">
        <div>
          <dt className="text-muted">{t("status")}</dt>
          <dd className="mt-1 text-ink">
            {credential.status} ({credential.effectiveStatus})
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("issuedAt")}</dt>
          <dd className="numeric mt-1 text-ink">
            {credential.issuedAt.toLocaleDateString(locale)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("memberName")}</dt>
          <dd className="mt-1 text-ink">
            {locale === "ar" ? credential.memberNameAr : credential.memberNameEn ?? credential.memberNameAr}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("membershipType")}</dt>
          <dd className="mt-1 text-ink">
            {locale === "ar" ? credential.membershipTypeAr : credential.membershipTypeEn}
          </dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-muted">{t("verificationUrl")}</dt>
          <dd className="numeric mt-1 break-all text-ink">{verifyUrl}</dd>
        </div>
      </dl>

      <AdminCredentialActions credentialId={credential.id} status={credential.status} />

      <section className="mt-8">
        <h2 className="text-lg text-ink">{t("historyTitle")}</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {history.map((entry) => (
            <li key={entry.id} className="border border-line bg-canvas px-4 py-3">
              <span className="text-ink">
                {entry.fromStatus} → {entry.toStatus}
              </span>
              <span className="mx-2 text-muted">·</span>
              <span className="numeric text-muted">
                {entry.createdAt.toLocaleString(locale)}
              </span>
              {entry.reason ? <p className="mt-1 text-graphite">{entry.reason}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
