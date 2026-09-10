export const MEMBERSHIP_TYPE_SEED = [
  { slug: "founding_member", code: "FND", nameAr: "عضو مؤسس", nameEn: "Founding Member" },
  { slug: "expert_member", code: "EXP", nameAr: "عضو خبير", nameEn: "Expert Member" },
  { slug: "professional_member", code: "PRO", nameAr: "عضو مهني", nameEn: "Professional Member" },
  { slug: "contributor", code: "CTR", nameAr: "مساهم", nameEn: "Contributor" },
  { slug: "volunteer_member", code: "VOL", nameAr: "عضو متطوع", nameEn: "Volunteer Member" },
  { slug: "volunteer_leader", code: "VLD", nameAr: "قائد متطوعين", nameEn: "Volunteer Leader" },
  { slug: "distinguished_volunteer", code: "DVL", nameAr: "متطوع متميز", nameEn: "Distinguished Volunteer" },
  { slug: "strategic_partner", code: "PTR", nameAr: "شريك استراتيجي", nameEn: "Strategic Partner" },
  { slug: "institutional_member", code: "INS", nameAr: "عضو مؤسسي", nameEn: "Institutional Member" },
] as const;

export const TRACK_SEED = [
  { code: "01", slug: "strategy", nameAr: "المسار الاستراتيجي", nameEn: "Strategic Path" },
  { code: "02", slug: "execution", nameAr: "مسار التنفيذ", nameEn: "Execution Path" },
  { code: "03", slug: "performance", nameAr: "مسار الأداء", nameEn: "Performance Path" },
  { code: "04", slug: "institutional-excellence", nameAr: "مسار التميز المؤسسي", nameEn: "Institutional Excellence Path" },
  { code: "05", slug: "institutional-transformation", nameAr: "مسار التحول المؤسسي", nameEn: "Institutional Transformation Path" },
  { code: "06", slug: "grc", nameAr: "مسار الحوكمة والمخاطر", nameEn: "Governance, Risk & Compliance Path" },
  { code: "07", slug: "human-capital", nameAr: "مسار رأس المال البشري", nameEn: "Human Capital Path" },
  { code: "08", slug: "ai-automation", nameAr: "مسار الذكاء الاصطناعي والأتمتة", nameEn: "AI & Automation Path" },
] as const;

export const LIFETIME_MEMBERSHIP_SLUGS = new Set([
  "founding_member",
  "strategic_partner",
  "institutional_member",
]);

export const ELEVATED_APPROVAL_SLUGS = new Set(["founding_member", "expert_member"]);

export function getPublicMembershipTypes() { return MEMBERSHIP_TYPE_SEED; }
export function getPublicTracks() { return TRACK_SEED; }
