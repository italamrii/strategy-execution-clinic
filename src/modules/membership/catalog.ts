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
  { code: "01", slug: "strategy", nameAr: "الاستراتيجية", nameEn: "Strategy" },
  { code: "02", slug: "execution", nameAr: "التنفيذ", nameEn: "Execution" },
  { code: "03", slug: "performance", nameAr: "الأداء", nameEn: "Performance" },
  { code: "04", slug: "institutional-excellence", nameAr: "التميز المؤسسي", nameEn: "Institutional Excellence" },
  { code: "05", slug: "institutional-transformation", nameAr: "التحول المؤسسي", nameEn: "Institutional Transformation" },
  { code: "06", slug: "grc", nameAr: "الحوكمة والمخاطر والالتزام", nameEn: "Governance, Risk & Compliance" },
  { code: "07", slug: "human-capital", nameAr: "رأس المال البشري", nameEn: "Human Capital" },
  { code: "08", slug: "ai-automation", nameAr: "الذكاء الاصطناعي والأتمتة", nameEn: "AI & Automation" },
] as const;

export function getPublicMembershipTypes() { return MEMBERSHIP_TYPE_SEED; }
export function getPublicTracks() { return TRACK_SEED; }
