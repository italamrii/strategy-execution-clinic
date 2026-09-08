import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { Button } from "@/shared/ui/button";
import { MembershipCardVisual } from "@/shared/ui/membership-card";
import { PreviewModal } from "@/shared/ui/preview-modal";
import { PreviewTabs } from "@/shared/ui/preview-tabs";
import { StatusPill } from "@/shared/ui/status-pill";
import { TextField } from "@/shared/ui/text-field";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-16 border-t border-line pt-10">
      <h2 className="text-2xl text-ink">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function DesignPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("designPreview");

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm tracking-[0.18em] text-gold-deep">SEC</p>
      <h1 className="mt-4 text-4xl text-ink">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-graphite">{t("subtitle")}</p>
      <p className="mt-4">
        <a href={`/${locale}/design-preview/credentials`} className="text-sm text-navy hover:underline">
          {t("credentialGalleryTitle")}
        </a>
      </p>

      <Section title={t("typography")}>
        <div className="grid gap-8 md:grid-cols-2">
          <div lang="ar">
            <p className="text-sm text-muted">{t("arabicType")}</p>
            <p className="mt-3 text-4xl leading-tight">عيادة الاستراتيجية والتنفيذ</p>
            <p className="mt-3 text-lg leading-loose text-graphite">
              تطوعك ليس ساعات فقط، بل سجل أثر مهني موثّق.
            </p>
          </div>
          <div lang="en" className="font-[family-name:var(--font-latin)]">
            <p className="text-sm text-muted">{t("englishType")}</p>
            <p className="mt-3 text-4xl leading-tight">Strategy & Execution Clinic</p>
            <p className="mt-3 text-lg leading-relaxed text-graphite">
              Membership is a credential. Volunteering is a professional record.
            </p>
          </div>
        </div>
      </Section>

      <Section title={t("buttons")}>
        <div className="flex flex-wrap gap-3">
          <Button type="button">{t("primary")}</Button>
          <Button type="button" variant="secondary">
            {t("secondary")}
          </Button>
          <Button type="button" variant="ghost">
            {t("ghost")}
          </Button>
          <Button type="button" variant="danger">
            {t("danger")}
          </Button>
        </div>
      </Section>

      <Section title={t("inputs")}>
        <div className="grid max-w-md gap-6">
          <TextField label={t("nameLabel")} name="name" defaultValue={t("sampleName")} />
          <TextField label={t("emailLabel")} name="email" type="email" />
        </div>
      </Section>

      <Section title={t("tabs")}>
        <PreviewTabs
          tabs={[
            { id: "overview", label: t("tabOverview"), panel: t("subtitle") },
            { id: "volunteer", label: t("tabVolunteer"), panel: t("hours") },
            { id: "credentials", label: t("tabCredentials"), panel: t("active") },
          ]}
        />
      </Section>

      <Section title={t("profile")}>
        <article className="max-w-xl border border-line bg-surface p-8">
          <h3 className="text-2xl">{t("sampleName")}</h3>
          <p className="mt-1 font-[family-name:var(--font-latin)] text-graphite">
            {t("sampleNameEn")}
          </p>
          <p className="mt-4 text-sm text-gold-deep">Founding Member · AI & Automation</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">{t("impactScore")}</dt>
              <dd className="numeric mt-1 text-xl text-ink">—</dd>
            </div>
            <div>
              <dt className="text-muted">{t("hours")}</dt>
              <dd className="numeric mt-1 text-xl text-ink">—</dd>
            </div>
          </dl>
        </article>
      </Section>

      <Section title={t("membershipCards")}>
        <div className="grid gap-6 lg:grid-cols-2">
          <MembershipCardVisual
            variant="founding"
            clinic="STRATEGY & EXECUTION CLINIC"
            nameAr={t("sampleName")}
            nameEn={t("sampleNameEn")}
            typeAr="عضو مؤسس"
            typeEn="Founding Member"
            track="AI & Automation Track"
            memberId="SEC-FND-2026-K7M4"
            status={t("active")}
          />
          <MembershipCardVisual
            variant="volunteer"
            clinic="STRATEGY & EXECUTION CLINIC"
            nameAr={t("sampleName")}
            nameEn={t("sampleNameEn")}
            typeAr="عضو متطوع"
            typeEn="Volunteer Member"
            track="AI & Automation Track"
            memberId="SEC-VOL-2026-H3Q9"
            status={t("active")}
            hours="84"
          />
        </div>
      </Section>

      <Section title={t("badges")}>
        <div className="flex flex-wrap gap-3">
          {["Contributor", "Lab Leader", "AI Pioneer", "Distinguished Volunteer"].map((badge) => (
            <span key={badge} className="border border-gold px-3 py-2 text-sm text-navy">
              {badge}
            </span>
          ))}
        </div>
      </Section>

      <Section title={t("status")}>
        <div className="flex flex-wrap gap-3">
          <StatusPill tone="active">{t("active")}</StatusPill>
          <StatusPill tone="pending">{t("pending")}</StatusPill>
          <StatusPill tone="suspended">{t("suspended")}</StatusPill>
          <StatusPill tone="expired">{t("expired")}</StatusPill>
          <StatusPill tone="revoked">{t("revoked")}</StatusPill>
        </div>
      </Section>

      <Section title={t("tables")}>
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[32rem] text-start text-sm">
            <thead className="bg-ivory text-graphite">
              <tr>
                <th className="px-4 py-3 font-medium">{t("nameLabel")}</th>
                <th className="px-4 py-3 font-medium">{t("tabCredentials")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <td className="px-4 py-3">{t("sampleName")}</td>
                <td className="numeric px-4 py-3">SEC-VOL-2026-H3Q9</td>
                <td className="px-4 py-3">{t("active")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t("charts")}>
        <div className="grid max-w-lg gap-3">
          {[72, 48, 31, 18].map((value, index) => (
            <div key={value} className="grid grid-cols-[7rem_1fr] items-center gap-4">
              <span className="text-sm text-graphite">0{index + 1}</span>
              <div className="h-3 bg-ivory">
                <div
                  className={`h-3 ${index === 0 ? "bg-gold" : "bg-navy"}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("modal")}>
        <PreviewModal
          openLabel={t("openModal")}
          title={t("modal")}
          body={t("modalBody")}
          closeLabel={t("close")}
        />
      </Section>

      <Section title={t("mobileNav")}>
        <div className="mx-auto max-w-sm border border-line bg-surface">
          <div className="grid grid-cols-4 text-center text-xs text-graphite">
            <span className="border-t-2 border-gold py-4 text-navy">Home</span>
            <span className="py-4">Card</span>
            <span className="py-4">Hours</span>
            <span className="py-4">Profile</span>
          </div>
        </div>
      </Section>

    </main>
  );
}
