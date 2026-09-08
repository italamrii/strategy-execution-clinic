import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { MembershipCardVisual } from "@/shared/ui/membership-card";

const FIXTURES = [
  {
    variant: "founding" as const,
    typeAr: "عضو مؤسس",
    typeEn: "Founding Member",
    memberId: "SEC-FND-2026-K7M4QX",
  },
  {
    variant: "expert" as const,
    typeAr: "عضو خبير",
    typeEn: "Expert Member",
    memberId: "SEC-EXP-2026-W7T4KN",
  },
  {
    variant: "professional" as const,
    typeAr: "عضو مهني",
    typeEn: "Professional Member",
    memberId: "SEC-PRO-2026-8K4P7X",
  },
  {
    variant: "volunteer" as const,
    typeAr: "عضو متطوع",
    typeEn: "Volunteer Member",
    memberId: "SEC-VOL-2026-R9M2QD",
  },
  {
    variant: "leader" as const,
    typeAr: "قائد متطوع",
    typeEn: "Volunteer Leader",
    memberId: "SEC-VLD-2026-M3N8KP",
  },
  {
    variant: "distinguished" as const,
    typeAr: "متطوع متميز",
    typeEn: "Distinguished Volunteer",
    memberId: "SEC-DVO-2026-P5Q2LM",
  },
] as const;

export default async function DesignPreviewCredentialsPage({
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
      <p className="text-sm tracking-[0.18em] text-gold-deep">SEC · FIXTURE DATA</p>
      <h1 className="mt-4 text-4xl text-ink">{t("credentialGalleryTitle")}</h1>
      <p className="mt-4 max-w-2xl text-graphite">{t("credentialGallerySubtitle")}</p>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {FIXTURES.map((fixture) => (
          <MembershipCardVisual
            key={fixture.memberId}
            variant={fixture.variant}
            clinic="STRATEGY & EXECUTION CLINIC"
            nameAr={t("sampleName")}
            nameEn={t("sampleNameEn")}
            typeAr={fixture.typeAr}
            typeEn={fixture.typeEn}
            track="AI & Automation Track"
            memberId={fixture.memberId}
            status={t("active")}
          />
        ))}
      </div>
    </main>
  );
}
