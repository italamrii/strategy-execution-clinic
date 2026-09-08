export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "changes_requested",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const MEMBERSHIP_STATUSES = [
  "active",
  "suspended",
  "expired",
  "revoked",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "withdrawn"],
  under_review: ["changes_requested", "approved", "rejected"],
  changes_requested: ["submitted", "withdrawn"],
  approved: [],
  rejected: [],
  withdrawn: [],
};

export function canTransitionApplication(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return APPLICATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): void {
  if (!canTransitionApplication(from, to)) {
    throw new Error(`invalid_application_transition:${from}->${to}`);
  }
}

export const OPEN_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "changes_requested",
];
