import type { ProgressionLevel } from "./states";

export const IMPACT_RULE_SEEDS = [
  { eventKind: "volunteer_hours", weight: 2, isEnabled: true },
  { eventKind: "opportunity_completed", weight: 25, isEnabled: true },
  { eventKind: "leadership_contribution", weight: 50, isEnabled: true },
  { eventKind: "approved_contribution", weight: 1, isEnabled: true },
] as const;

export type ProgressionRuleSeed = {
  slug: ProgressionLevel;
  nameAr: string;
  nameEn: string;
  predicate: {
    minApprovedHours?: number;
    minCompletedOpportunities?: number;
    minImpactScore?: number;
    requiresManualApproval?: boolean;
  };
};

export const PROGRESSION_RULE_SEEDS: ProgressionRuleSeed[] = [
  {
    slug: "volunteer",
    nameAr: "متطوع",
    nameEn: "Volunteer",
    predicate: {},
  },
  {
    slug: "active_volunteer",
    nameAr: "متطوع نشط",
    nameEn: "Active Volunteer",
    predicate: { minApprovedHours: 20, minCompletedOpportunities: 1 },
  },
  {
    slug: "distinguished_volunteer",
    nameAr: "متطوع متميز",
    nameEn: "Distinguished Volunteer",
    predicate: { minApprovedHours: 80, minCompletedOpportunities: 3, minImpactScore: 100 },
  },
  {
    slug: "volunteer_leader",
    nameAr: "قائد متطوعين",
    nameEn: "Volunteer Leader",
    predicate: {
      minApprovedHours: 120,
      minCompletedOpportunities: 5,
      minImpactScore: 200,
      requiresManualApproval: true,
    },
  },
  {
    slug: "community_ambassador",
    nameAr: "سفير المجتمع",
    nameEn: "Community Ambassador",
    predicate: {
      minApprovedHours: 200,
      minCompletedOpportunities: 8,
      minImpactScore: 350,
      requiresManualApproval: true,
    },
  },
];
