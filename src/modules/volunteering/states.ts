export const VOLUNTEER_PROFILE_STATUSES = [
  "active",
  "paused",
  "suspended",
  "archived",
] as const;
export type VolunteerProfileStatus = (typeof VOLUNTEER_PROFILE_STATUSES)[number];

export const OPPORTUNITY_STATUSES = [
  "draft",
  "published",
  "applications_closed",
  "in_progress",
  "completed",
  "cancelled",
  "archived",
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

const OPPORTUNITY_TRANSITIONS: Record<OpportunityStatus, readonly OpportunityStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["applications_closed", "in_progress", "cancelled"],
  applications_closed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

export function assertOpportunityTransition(from: OpportunityStatus, to: OpportunityStatus): void {
  if (!OPPORTUNITY_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`invalid_opportunity_transition:${from}->${to}`);
  }
}

export const APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "withdrawn",
  "waitlisted",
] as const;
export type VolunteerApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const APPLICATION_TRANSITIONS: Record<
  VolunteerApplicationStatus,
  readonly VolunteerApplicationStatus[]
> = {
  submitted: ["under_review", "withdrawn"],
  under_review: ["accepted", "rejected", "waitlisted", "withdrawn"],
  accepted: [],
  rejected: [],
  withdrawn: [],
  waitlisted: ["accepted", "rejected", "withdrawn"],
};

export function assertApplicationTransition(
  from: VolunteerApplicationStatus,
  to: VolunteerApplicationStatus,
): void {
  if (!APPLICATION_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`invalid_volunteer_application_transition:${from}->${to}`);
  }
}

export const PARTICIPATION_STATUSES = [
  "accepted",
  "active",
  "completed",
  "withdrawn",
  "removed",
] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export const ATTENDANCE_STATUSES = [
  "pending",
  "attended",
  "partial",
  "absent",
  "excused",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const HOUR_ENTRY_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "voided",
] as const;
export type HourEntryStatus = (typeof HOUR_ENTRY_STATUSES)[number];

export const HOUR_SOURCES = [
  "volunteer_submission",
  "organizer_submission",
  "attendance_derived",
  "admin_adjustment",
] as const;
export type HourSource = (typeof HOUR_SOURCES)[number];

export const PROGRESSION_LEVELS = [
  "volunteer",
  "active_volunteer",
  "distinguished_volunteer",
  "volunteer_leader",
  "community_ambassador",
] as const;
export type ProgressionLevel = (typeof PROGRESSION_LEVELS)[number];

export const MANUAL_APPROVAL_LEVELS: readonly ProgressionLevel[] = [
  "volunteer_leader",
  "community_ambassador",
];
