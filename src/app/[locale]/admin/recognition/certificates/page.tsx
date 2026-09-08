import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  requireAuthenticatedPermission,
} from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { RecognitionAdminNav } from "@/modules/recognition/ui/admin-nav";
import { CertificateRevokeForm } from "@/modules/recognition/ui/certificate-revoke";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("adminRecognition");
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("unauthorized")}</h1></main>;
  }
  try {
    await requireAuthenticatedPermission("certificate.issue");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return <main className="mx-auto max-w-6xl px-6 py-24"><h1>{t("forbidden")}</h1></main>;
    }
    throw error;
  }

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("certificatesTitle")}</h1>
      <RecognitionAdminNav active="certificates" />
      <section className="mt-10 border border-line bg-surface p-6">
        <h2 className="text-xl text-navy">{t("revokeCertificate")}</h2>
        <CertificateRevokeForm />
      </section>
    </main>
  );
}
