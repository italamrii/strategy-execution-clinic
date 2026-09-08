export const CONTRIBUTION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "revoked",
] as const;
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

export const BADGE_AWARD_STATUSES = ["active", "suspended", "expired", "revoked"] as const;
export type BadgeAwardStatus = (typeof BADGE_AWARD_STATUSES)[number];

export const CERTIFICATE_STATUSES = ["active", "suspended", "expired", "revoked"] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

export const CONTRIBUTION_TYPE_SEEDS = [
  {
    slug: "research",
    nameAr: "مساهمة بحثية",
    nameEn: "Research contribution",
    impactWeight: 25,
    sortOrder: 10,
  },
  {
    slug: "article",
    nameAr: "مقال",
    nameEn: "Article",
    impactWeight: 15,
    sortOrder: 20,
  },
  {
    slug: "workshop",
    nameAr: "مساهمة ورشة",
    nameEn: "Workshop contribution",
    impactWeight: 20,
    sortOrder: 30,
  },
  {
    slug: "mentoring",
    nameAr: "إرشاد",
    nameEn: "Mentoring",
    impactWeight: 20,
    sortOrder: 40,
  },
  {
    slug: "technical",
    nameAr: "تطوير تقني",
    nameEn: "Technical development",
    impactWeight: 25,
    sortOrder: 50,
  },
  {
    slug: "community",
    nameAr: "مساهمة مجتمعية",
    nameEn: "Community contribution",
    impactWeight: 10,
    sortOrder: 60,
  },
] as const;

export const BADGE_DEFINITION_SEEDS = [
  {
    slug: "founding_member",
    nameAr: "عضو مؤسس",
    nameEn: "Founding Member",
    criteriaAr: "عضوية مؤسسة معتمدة",
    criteriaEn: "Approved founding membership",
    issuanceMode: "manual" as const,
    criteria: { requiresManualApproval: true },
  },
  {
    slug: "contributor",
    nameAr: "مساهم",
    nameEn: "Contributor",
    criteriaAr: "مساهمة معتمدة واحدة على الاقل",
    criteriaEn: "At least one approved contribution",
    issuanceMode: "automatic" as const,
    criteria: { minApprovedContributions: 1 },
  },
  {
    slug: "distinguished_volunteer",
    nameAr: "متطوع متميز",
    nameEn: "Distinguished Volunteer",
    criteriaAr: "ساعات تطوع معتمدة وفق العتبة",
    criteriaEn: "Approved volunteer hours meeting threshold",
    issuanceMode: "automatic" as const,
    criteria: { minApprovedHours: 80, minCompletedOpportunities: 3 },
  },
  {
    slug: "volunteer_leader",
    nameAr: "قائد متطوعين",
    nameEn: "Volunteer Leader",
    criteriaAr: "اعتراف قيادي بموافقة بشرية",
    criteriaEn: "Leadership recognition requires human approval",
    issuanceMode: "manual" as const,
    criteria: { requiresManualApproval: true },
  },
  {
    slug: "lab_contributor",
    nameAr: "مساهم في المختبر",
    nameEn: "Lab Contributor",
    criteriaAr: "مساهمة مختبر معتمدة",
    criteriaEn: "Approved lab contribution",
    issuanceMode: "hybrid" as const,
    criteria: { contributionTypeSlug: "workshop", requiresManualApproval: true },
  },
  {
    slug: "strategy_contributor",
    nameAr: "مساهم في الاستراتيجية",
    nameEn: "Strategy Contributor",
    criteriaAr: "مساهمة استراتيجية معتمدة",
    criteriaEn: "Approved strategy contribution",
    issuanceMode: "hybrid" as const,
    criteria: { requiresManualApproval: true },
  },
  {
    slug: "performance_contributor",
    nameAr: "مساهم في الأداء",
    nameEn: "Performance Contributor",
    criteriaAr: "مساهمة أداء معتمدة",
    criteriaEn: "Approved performance contribution",
    issuanceMode: "hybrid" as const,
    criteria: { requiresManualApproval: true },
  },
  {
    slug: "ai_pioneer",
    nameAr: "رائد الذكاء الاصطناعي",
    nameEn: "AI Pioneer",
    criteriaAr: "اعتراف خبير بموافقة بشرية",
    criteriaEn: "Expert recognition requires human approval",
    issuanceMode: "manual" as const,
    criteria: { requiresManualApproval: true },
  },
] as const;

export const CERTIFICATE_DEFINITION_SEEDS = [
  {
    slug: "founding_membership",
    titleAr: "شهادة عضوية مؤسسة",
    titleEn: "Founding Membership Certificate",
    sourceRequirement: "membership:founding_member",
  },
  {
    slug: "distinguished_volunteer",
    titleAr: "شهادة متطوع متميز",
    titleEn: "Distinguished Volunteer Certificate",
    sourceRequirement: "badge:distinguished_volunteer",
  },
  {
    slug: "approved_contribution",
    titleAr: "شهادة مساهمة معتمدة",
    titleEn: "Approved Contribution Certificate",
    sourceRequirement: "contribution:approved",
  },
] as const;

export const VOLUNTEER_HOUR_MILESTONES = [25, 50, 100, 250] as const;

export const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "verify",
  "login",
  "account",
  "security",
  "members",
  "member",
  "badge",
  "certificate",
  "volunteer",
  "membership",
  "null",
  "undefined",
]);
