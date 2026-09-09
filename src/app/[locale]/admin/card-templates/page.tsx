import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { resolvePageAccess } from "@/modules/identity";
import { listCardTemplatesForAdmin } from "@/modules/credentials/templates";
import { CardTemplateForm } from "@/modules/credentials/ui/card-template-form";
import { AccessDenied } from "@/shared/ui/access-denied";
import type { CardDesign } from "@/modules/credentials/card-svg";

export const dynamic = "force-dynamic";

export default async function CardTemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = requireLocale(raw);
  setRequestLocale(locale);
  const access = await resolvePageAccess(["card.template.manage", "credential.template.manage"]);
  if (access.status !== "ok") {
    return <AccessDenied status={access.status} email={access.auth?.email ?? null} />;
  }
  const t = await getTranslations("cardTemplates");
  const templates = await listCardTemplatesForAdmin();
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <p className="mt-3 text-graphite">{t("description")}</p>
      {templates.map((row) => (
        <CardTemplateForm key={row.id} template={{ ...row, config: row.config as CardDesign }} />
      ))}
      {templates.length === 0 ? <CardTemplateForm /> : null}
    </main>
  );
}
