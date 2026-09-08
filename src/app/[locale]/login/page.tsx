import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import { LoginForm } from "@/modules/identity/ui/login-form";
import { AuthShell } from "@/shared/ui/auth-shell";
import { resolveAppEnvironment } from "@/shared/config/runtime";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const existing = await getOptionalAuthContext();
  if (existing) {
    redirect({ href: "/account", locale });
  }
  const t = await getTranslations();
  return (
    <main id="main" aria-label={t("a11y.main")} className="auth-page">
      <AuthShell>
        <LoginForm showLocalOtpHint={resolveAppEnvironment() === "local"} />
      </AuthShell>
    </main>
  );
}
