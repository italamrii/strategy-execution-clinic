/** Configurable membership slugs eligible to activate a volunteer profile. */
export const VOLUNTEER_ELIGIBLE_MEMBERSHIP_SLUGS = [
  "volunteer_member",
  "founding_member",
  "expert_member",
  "professional_member",
  "contributor_member",
] as const;

export type VolunteerEligibleSlug = (typeof VOLUNTEER_ELIGIBLE_MEMBERSHIP_SLUGS)[number];

export function isEligibleMembershipSlug(slug: string): slug is VolunteerEligibleSlug {
  return (VOLUNTEER_ELIGIBLE_MEMBERSHIP_SLUGS as readonly string[]).includes(slug);
}
