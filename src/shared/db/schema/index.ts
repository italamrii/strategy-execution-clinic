import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  clerkUserId: text("clerk_user_id"),
  locale: text("locale").notNull().default("ar"),
  status: text("status").notNull().default("active"),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex("users_email_unique").on(t.email),
  uniqueIndex("users_clerk_user_id_unique").on(t.clerkUserId),
]);

export const authOtpChallenges = pgTable("auth_otp_challenges", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  email: text("email").notNull(),
  purpose: text("purpose").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  requestMeta: jsonb("request_meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("auth_otp_challenges_email_created_idx").on(t.email, t.createdAt),
]);

export const authMagicLinks = pgTable("auth_magic_links", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  rotatedFrom: uuid("rotated_from"),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("sessions_user_id_idx").on(t.userId),
  uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
]);

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  id: uuid("id").primaryKey(),
  bucketKey: text("bucket_key").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("rate_limit_buckets_key_window_unique").on(t.bucketKey, t.windowStart)]);

export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  credentialId: text("credential_id").notNull(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: jsonb("transports"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("webauthn_credential_id_unique").on(t.credentialId)]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  displayNameAr: text("display_name_ar").notNull(),
  displayNameEn: text("display_name_en"),
  headlineAr: text("headline_ar"),
  headlineEn: text("headline_en"),
  bioAr: text("bio_ar"),
  bioEn: text("bio_en"),
  photoMediaId: uuid("photo_media_id"),
  city: text("city"),
  country: text("country").default("SA"),
  visibility: text("visibility").notNull().default("private"),
  hoursPublic: boolean("hours_public").notNull().default(false),
  directoryOptIn: boolean("directory_opt_in").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("profiles_user_id_unique").on(t.userId)]);

export const profileContacts = pgTable("profile_contacts", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  legalName: text("legal_name"),
  phoneE164: text("phone_e164"),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  adminNotes: text("admin_notes"),
  sharingEnabled: boolean("sharing_enabled").notNull().default(false),
  sharingScope: text("sharing_scope").notNull().default("private"),
  ...timestamps,
}, (t) => [uniqueIndex("profile_contacts_user_id_unique").on(t.userId)]);

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  isSystem: boolean("is_system").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("roles_slug_unique").on(t.slug)]);

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  description: text("description").notNull(),
}, (t) => [uniqueIndex("permissions_slug_unique").on(t.slug)]);

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey(),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id),
}, (t) => [uniqueIndex("role_permissions_unique").on(t.roleId, t.permissionId)]);

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  organizationId: uuid("organization_id"),
  grantedBy: uuid("granted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("user_roles_user_role_global_unique")
    .on(t.userId, t.roleId)
    .where(sql`${t.organizationId} is null`),
  uniqueIndex("user_roles_user_role_org_unique")
    .on(t.userId, t.roleId, t.organizationId)
    .where(sql`${t.organizationId} is not null`),
]);

export const membershipTypes = pgTable("membership_types", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  code: text("code").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  applicationsOpen: boolean("applications_open").notNull().default(true),
  invitationOnly: boolean("invitation_only").notNull().default(false),
  visibility: text("visibility").notNull().default("public"),
  validityMode: text("validity_mode").notNull().default("lifetime"),
  validityDays: integer("validity_days"),
  renewalRequired: boolean("renewal_required").notNull().default(false),
  cardDesign: jsonb("card_design"),
  applicationSchema: jsonb("application_schema"),
  workflow: jsonb("workflow"),
  entitlements: jsonb("entitlements"),
  expirationPolicy: jsonb("expiration_policy"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [
  uniqueIndex("membership_types_slug_unique").on(t.slug),
  uniqueIndex("membership_types_code_unique").on(t.code),
]);

export const tracks = pgTable("tracks", {
  id: uuid("id").primaryKey(),
  code: text("code").notNull(),
  slug: text("slug").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  purposeAr: text("purpose_ar"),
  purposeEn: text("purpose_en"),
  scopeAr: text("scope_ar"),
  scopeEn: text("scope_en"),
  iconKey: text("icon_key").notNull().default("track"),
  status: text("status").notNull().default("active"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  applicationsOpen: boolean("applications_open").notNull().default(true),
  allowSecondary: boolean("allow_secondary").notNull().default(true),
  maxSecondary: integer("max_secondary").notNull().default(2),
  sortOrder: integer("sort_order").notNull().default(0),
  cardAccent: jsonb("card_accent"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex("tracks_code_unique").on(t.code),
  uniqueIndex("tracks_slug_unique").on(t.slug),
]);

export const membershipApplications = pgTable("membership_applications", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  membershipTypeId: uuid("membership_type_id").notNull().references(() => membershipTypes.id),
  status: text("status").notNull().default("draft"),
  headline: text("headline"),
  summary: text("summary"),
  motivation: text("motivation"),
  experience: text("experience"),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  githubUrl: text("github_url"),
  additionalNotes: text("additional_notes"),
  payload: jsonb("payload"),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  decisionReason: text("decision_reason"),
  internalNotes: text("internal_notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index("membership_applications_user_status_idx").on(t.userId, t.status),
  index("membership_applications_status_submitted_idx").on(t.status, t.submittedAt),
  index("membership_applications_type_status_idx").on(t.membershipTypeId, t.status),
]);

export const membershipApplicationTracks = pgTable("membership_application_tracks", {
  id: uuid("id").primaryKey(),
  applicationId: uuid("application_id").notNull().references(() => membershipApplications.id),
  trackId: uuid("track_id").notNull().references(() => tracks.id),
  source: text("source").notNull().default("applicant"),
}, (t) => [
  uniqueIndex("membership_application_tracks_unique").on(t.applicationId, t.trackId),
  index("membership_application_tracks_app_idx").on(t.applicationId),
]);

export const membershipApplicationReviews = pgTable("membership_application_reviews", {
  id: uuid("id").primaryKey(),
  applicationId: uuid("application_id").notNull().references(() => membershipApplications.id),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  reason: text("reason"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("membership_application_reviews_app_idx").on(t.applicationId)]);

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  membershipTypeId: uuid("membership_type_id").notNull().references(() => membershipTypes.id),
  applicationId: uuid("application_id").references(() => membershipApplications.id),
  status: text("status").notNull().default("active"),
  isPrimary: boolean("is_primary").notNull().default(true),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  issuedBy: uuid("issued_by").references(() => users.id),
  issueReason: text("issue_reason"),
  ...timestamps,
}, (t) => [
  index("memberships_user_status_idx").on(t.userId, t.status),
  index("memberships_type_status_idx").on(t.membershipTypeId, t.status),
  uniqueIndex("memberships_one_active_per_type")
    .on(t.userId, t.membershipTypeId)
    .where(sql`${t.status} = 'active'`),
]);

export const memberTracks = pgTable("member_tracks", {
  id: uuid("id").primaryKey(),
  membershipId: uuid("membership_id").notNull().references(() => memberships.id),
  trackId: uuid("track_id").notNull().references(() => tracks.id),
  isPrimary: boolean("is_primary").notNull().default(false),
}, (t) => [uniqueIndex("member_tracks_unique").on(t.membershipId, t.trackId)]);

export const membershipStatusHistory = pgTable("membership_status_history", {
  id: uuid("id").primaryKey(),
  membershipId: uuid("membership_id").notNull().references(() => memberships.id),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("membership_status_history_membership_idx").on(t.membershipId)]);

export const credentials = pgTable("credentials", {
  id: uuid("id").primaryKey(),
  membershipId: uuid("membership_id").notNull().references(() => memberships.id),
  publicCode: text("public_code").notNull(),
  status: text("status").notNull().default("active"),
  tokenVersion: integer("token_version").notNull().default(1),
  designVersion: text("design_version").notNull().default("CARD_DESIGN_V1"),
  issuanceSource: text("issuance_source"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokeReason: text("revoke_reason"),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
}, (t) => [
  uniqueIndex("credentials_membership_unique").on(t.membershipId),
  uniqueIndex("credentials_public_code_unique").on(t.publicCode),
  index("credentials_status_idx").on(t.status),
]);

export const credentialStatusHistory = pgTable("credential_status_history", {
  id: uuid("id").primaryKey(),
  credentialId: uuid("credential_id").notNull().references(() => credentials.id),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  reason: text("reason"),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("credential_status_history_credential_idx").on(t.credentialId)]);

export const credentialAssets = pgTable("credential_assets", {
  id: uuid("id").primaryKey(),
  credentialId: uuid("credential_id").notNull().references(() => credentials.id),
  kind: text("kind").notNull(),
  locale: text("locale").notNull(),
  designVersion: text("design_version").notNull().default("CARD_DESIGN_V1"),
  contentHash: text("content_hash").notNull(),
  storageKey: text("storage_key").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("credential_assets_unique").on(
    t.credentialId,
    t.kind,
    t.locale,
    t.designVersion,
    t.contentHash,
  ),
  index("credential_assets_credential_idx").on(t.credentialId),
]);

export const volunteerProfiles = pgTable("volunteer_profiles", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"),
  availability: jsonb("availability"),
  preferredTracks: jsonb("preferred_tracks"),
  skills: jsonb("skills"),
  interests: jsonb("interests"),
  locationPreference: text("location_preference"),
  city: text("city"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
  progressionLevel: text("progression_level").notNull().default("volunteer"),
  approvedHoursCache: numeric("approved_hours_cache", { precision: 10, scale: 2 }).notNull().default("0"),
  pendingHoursCache: numeric("pending_hours_cache", { precision: 10, scale: 2 }).notNull().default("0"),
  impactScoreCache: integer("impact_score_cache").notNull().default(0),
  ...timestamps,
}, (t) => [uniqueIndex("volunteer_profiles_user_unique").on(t.userId)]);

export const volunteerOpportunities = pgTable("volunteer_opportunities", {
  id: uuid("id").primaryKey(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  trackId: uuid("track_id").references(() => tracks.id),
  requiredSkills: jsonb("required_skills"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  locationType: text("location_type").notNull().default("remote"),
  locationTextAr: text("location_text_ar"),
  locationTextEn: text("location_text_en"),
  maxParticipants: integer("max_participants"),
  expectedHours: numeric("expected_hours", { precision: 6, scale: 2 }),
  organizerUserId: uuid("organizer_user_id").references(() => users.id),
  applicationDeadline: timestamp("application_deadline", { withTimezone: true }),
  city: text("city"),
  status: text("status").notNull().default("draft"),
  visibility: text("visibility").notNull().default("public"),
  ...timestamps,
}, (t) => [
  index("volunteer_opportunities_status_idx").on(t.status),
  index("volunteer_opportunities_track_idx").on(t.trackId),
]);

export const volunteerOpportunityApplications = pgTable("volunteer_opportunity_applications", {
  id: uuid("id").primaryKey(),
  opportunityId: uuid("opportunity_id").notNull().references(() => volunteerOpportunities.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("submitted"),
  motivation: text("motivation"),
  relevantExperience: text("relevant_experience"),
  availabilityNote: text("availability_note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("volunteer_opportunity_applications_unique").on(t.opportunityId, t.userId),
  index("volunteer_opportunity_applications_status_idx").on(t.status),
]);

export const volunteerSessions = pgTable("volunteer_sessions", {
  id: uuid("id").primaryKey(),
  opportunityId: uuid("opportunity_id").notNull().references(() => volunteerOpportunities.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const volunteerParticipations = pgTable("volunteer_participations", {
  id: uuid("id").primaryKey(),
  opportunityId: uuid("opportunity_id").notNull().references(() => volunteerOpportunities.id),
  volunteerProfileId: uuid("volunteer_profile_id").notNull().references(() => volunteerProfiles.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("accepted"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  attendanceStatus: text("attendance_status").notNull().default("pending"),
  organizerUserId: uuid("organizer_user_id").references(() => users.id),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  uniqueIndex("volunteer_participations_unique").on(t.opportunityId, t.userId),
  index("volunteer_participations_volunteer_idx").on(t.volunteerProfileId),
  index("volunteer_participations_status_idx").on(t.status),
]);

export const volunteerAttendance = pgTable("volunteer_attendance", {
  id: uuid("id").primaryKey(),
  participationId: uuid("participation_id").notNull().references(() => volunteerParticipations.id),
  status: text("status").notNull(),
  recordedBy: uuid("recorded_by").notNull().references(() => users.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
});

export const volunteerHourEntries = pgTable("volunteer_hour_entries", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  opportunityId: uuid("opportunity_id").references(() => volunteerOpportunities.id),
  participationId: uuid("participation_id").references(() => volunteerParticipations.id),
  sessionId: uuid("session_id").references(() => volunteerSessions.id),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
  activityDate: date("activity_date"),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  source: text("source").notNull(),
  submittedBy: uuid("submitted_by").references(() => users.id),
  evidenceMediaId: uuid("evidence_media_id"),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("volunteer_hour_entries_user_status_idx").on(t.userId, t.status),
  index("volunteer_hour_entries_activity_date_idx").on(t.activityDate),
  index("volunteer_hour_entries_opportunity_idx").on(t.opportunityId),
]);

export const volunteerHourAdjustments = pgTable("volunteer_hour_adjustments", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  hourEntryId: uuid("hour_entry_id").references(() => volunteerHourEntries.id),
  deltaHours: numeric("delta_hours", { precision: 6, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const volunteerProgressionRules = pgTable("volunteer_progression_rules", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  predicate: jsonb("predicate").notNull(),
  targetMembershipTypeId: uuid("target_membership_type_id").references(() => membershipTypes.id),
  isEnabled: boolean("is_enabled").notNull().default(true),
});

export const volunteerLevelHistory = pgTable("volunteer_level_history", {
  id: uuid("id").primaryKey(),
  volunteerProfileId: uuid("volunteer_profile_id").notNull().references(() => volunteerProfiles.id),
  fromLevel: text("from_level").notNull(),
  toLevel: text("to_level").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contributions = pgTable("contributions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  contributionTypeId: uuid("contribution_type_id"),
  kind: text("kind").notNull(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  source: text("source").default("member_submission"),
  relatedOpportunityId: uuid("related_opportunity_id"),
  evidenceMediaId: uuid("evidence_media_id"),
  visibility: text("visibility").notNull().default("private"),
  status: text("status").notNull().default("submitted"),
  submittedBy: uuid("submitted_by"),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("contributions_user_status_idx").on(t.userId, t.status),
]);

export const contributionTypes = pgTable("contribution_types", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  isActive: boolean("is_active").notNull().default(true),
  requiresReview: boolean("requires_review").notNull().default(true),
  impactWeight: numeric("impact_weight", { precision: 8, scale: 2 }).notNull().default("10"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [uniqueIndex("contribution_types_slug_unique").on(t.slug)]);

export const badgeDefinitions = pgTable("badge_definitions", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  criteriaAr: text("criteria_ar"),
  criteriaEn: text("criteria_en"),
  issuerName: text("issuer_name").notNull(),
  criteria: jsonb("criteria"),
  openBadgesJson: jsonb("open_badges_json"),
  imageMediaId: uuid("image_media_id"),
  expiresAfterDays: integer("expires_after_days"),
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(true),
  issuanceMode: text("issuance_mode").notNull().default("manual"),
  expirationMode: text("expiration_mode").notNull().default("none"),
  designVersion: text("design_version").notNull().default("BADGE_DESIGN_V1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("badge_definitions_slug_unique").on(t.slug)]);

export const badgeAwards = pgTable("badge_awards", {
  id: uuid("id").primaryKey(),
  badgeDefinitionId: uuid("badge_definition_id").notNull().references(() => badgeDefinitions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  publicCode: text("public_code"),
  status: text("status").notNull().default("active"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  evidence: jsonb("evidence"),
  issuerUserId: uuid("issuer_user_id").references(() => users.id),
  sourceType: text("source_type"),
  sourceId: uuid("source_id"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("badge_awards_public_code_unique").on(t.publicCode),
  index("badge_awards_user_idx").on(t.userId),
]);

export const certificateDefinitions = pgTable("certificate_definitions", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  isActive: boolean("is_active").notNull().default(true),
  sourceRequirement: text("source_requirement").notNull(),
  templateVersion: text("template_version").notNull().default("CERTIFICATE_DESIGN_V1"),
  expirationDays: integer("expiration_days"),
  ...timestamps,
}, (t) => [uniqueIndex("certificate_definitions_slug_unique").on(t.slug)]);

export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey(),
  definitionId: uuid("definition_id").notNull().references(() => certificateDefinitions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  publicCode: text("public_code").notNull(),
  status: text("status").notNull().default("active"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  issuedBy: uuid("issued_by").references(() => users.id),
  templateVersion: text("template_version").notNull().default("CERTIFICATE_DESIGN_V1"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokeReason: text("revoke_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("certificates_public_code_unique").on(t.publicCode),
  uniqueIndex("certificates_source_unique").on(t.definitionId, t.sourceType, t.sourceId),
  index("certificates_user_idx").on(t.userId),
]);

export const memberMilestones = pgTable("member_milestones", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(),
  threshold: integer("threshold").notNull(),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
  sourceTotal: numeric("source_total", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("member_milestones_unique").on(t.userId, t.kind, t.threshold)]);

export const milestoneDefinitions = pgTable("milestone_definitions", {
  id: uuid("id").primaryKey(),
  kind: text("kind").notNull(),
  threshold: integer("threshold").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [uniqueIndex("milestone_definitions_kind_threshold_unique").on(t.kind, t.threshold)]);

export const publicProfileSettings = pgTable("public_profile_settings", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  showPhoto: boolean("show_photo").notNull().default(true),
  showHeadline: boolean("show_headline").notNull().default(true),
  showBiography: boolean("show_biography").notNull().default(true),
  showTracks: boolean("show_tracks").notNull().default(true),
  showVolunteerHours: boolean("show_volunteer_hours").notNull().default(false),
  showImpactScore: boolean("show_impact_score").notNull().default(false),
  showContributions: boolean("show_contributions").notNull().default(true),
  showBadges: boolean("show_badges").notNull().default(true),
  showCertificates: boolean("show_certificates").notNull().default(true),
  publicHandle: text("public_handle"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("public_profile_settings_user_unique").on(t.userId),
  uniqueIndex("public_profile_settings_handle_unique").on(t.publicHandle),
]);

export const impactRules = pgTable("impact_rules", {
  id: uuid("id").primaryKey(),
  eventKind: text("event_kind").notNull(),
  weight: numeric("weight", { precision: 8, scale: 2 }).notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  ...timestamps,
});

export const impactEvents = pgTable("impact_events", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(),
  sourceTable: text("source_table").notNull(),
  sourceId: uuid("source_id").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("impact_events_user_kind_idx").on(t.userId, t.kind)]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  orgRole: text("org_role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  visibility: text("visibility").notNull().default("public"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mediaObjects = pgTable("media_objects", {
  id: uuid("id").primaryKey(),
  bucket: text("bucket").notNull(),
  objectKey: text("object_key").notNull(),
  mime: text("mime").notNull(),
  byteSize: integer("byte_size").notNull(),
  checksum: text("checksum"),
  visibility: text("visibility").notNull().default("private"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  locale: text("locale").notNull(),
  channel: text("channel").notNull(),
  template: text("template").notNull(),
  payload: jsonb("payload"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationOutbox = pgTable("notification_outbox", {
  id: uuid("id").primaryKey(),
  eventType: text("event_type").notNull(),
  recipientUserId: uuid("recipient_user_id").notNull().references(() => users.id),
  channel: text("channel").notNull(),
  payload: jsonb("payload").notNull(),
  payloadVersion: integer("payload_version").notNull().default(1),
  status: text("status").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  lastErrorSanitized: text("last_error_sanitized"),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("notification_outbox_idempotency_unique").on(t.idempotencyKey),
  index("notification_outbox_status_available_idx").on(t.status, t.availableAt),
]);

export const inAppNotifications = pgTable("in_app_notifications", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull(),
  category: text("category").notNull(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  bodyAr: text("body_ar").notNull(),
  bodyEn: text("body_en").notNull(),
  linkPath: text("link_path"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("in_app_notifications_user_created_idx").on(t.userId, t.createdAt),
  index("in_app_notifications_user_unread_idx").on(t.userId, t.readAt),
]);

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  channel: text("channel").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  isRequired: boolean("is_required").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("notification_preferences_unique").on(t.userId, t.category, t.channel),
]);

export const contentBlocks = pgTable("content_blocks", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  kind: text("kind").notNull(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  bodyAr: text("body_ar").notNull(),
  bodyEn: text("body_en").notNull(),
  status: text("status").notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  updatedBy: uuid("updated_by").references(() => users.id),
  ...timestamps,
}, (t) => [
  uniqueIndex("content_blocks_slug_unique").on(t.slug),
  index("content_blocks_kind_status_idx").on(t.kind, t.status),
]);

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  bodyAr: text("body_ar").notNull(),
  bodyEn: text("body_en").notNull(),
  audience: text("audience").notNull(),
  severity: text("severity").notNull().default("info"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  ctaLabelAr: text("cta_label_ar"),
  ctaLabelEn: text("cta_label_en"),
  ctaPath: text("cta_path"),
  status: text("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
}, (t) => [index("announcements_active_idx").on(t.status, t.startAt, t.endAt)]);

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey(),
  key: text("key").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  payload: jsonb("payload"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("feature_flags_key_unique").on(t.key)]);

export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey(),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("system_settings_key_unique").on(t.key)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  requestId: text("request_id"),
  reason: text("reason"),
  before: jsonb("before"),
  after: jsonb("after"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_logs_resource_idx").on(t.resourceType, t.resourceId),
  index("audit_logs_actor_created_idx").on(t.actorUserId, t.createdAt),
  index("audit_logs_action_created_idx").on(t.action, t.createdAt),
]);

export const securityEvents = pgTable("security_events", {
  id: uuid("id").primaryKey(),
  kind: text("kind").notNull(),
  userId: uuid("user_id").references(() => users.id),
  requestId: text("request_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("security_events_kind_created_idx").on(t.kind, t.createdAt)]);

export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  purpose: text("purpose").notNull(),
  granted: boolean("granted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Operational track community membership (separate from membership-category member_tracks). */
export const trackMemberships = pgTable("track_memberships", {
  id: uuid("id").primaryKey(),
  trackId: uuid("track_id").notNull().references(() => tracks.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  membershipId: uuid("membership_id").references(() => memberships.id),
  role: text("role").notNull().default("member"),
  isPrimary: boolean("is_primary").notNull().default(false),
  status: text("status").notNull().default("active"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("left_at", { withTimezone: true }),
  source: text("source").notNull().default("application"),
  assignedBy: uuid("assigned_by").references(() => users.id),
  ...timestamps,
}, (t) => [
  uniqueIndex("track_memberships_track_user_unique").on(t.trackId, t.userId),
  index("track_memberships_user_status_idx").on(t.userId, t.status),
  index("track_memberships_track_status_idx").on(t.trackId, t.status),
  uniqueIndex("track_memberships_one_primary_per_user")
    .on(t.userId)
    .where(sql`${t.isPrimary} = true AND ${t.status} = 'active'`),
]);

export const trackLeadershipAssignments = pgTable("track_leadership_assignments", {
  id: uuid("id").primaryKey(),
  trackId: uuid("track_id").notNull().references(() => tracks.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  leadershipRole: text("leadership_role").notNull(),
  status: text("status").notNull().default("active"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  appointedBy: uuid("appointed_by").references(() => users.id),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokeReason: text("revoke_reason"),
  ...timestamps,
}, (t) => [
  index("track_leadership_track_status_idx").on(t.trackId, t.status),
  index("track_leadership_user_idx").on(t.userId),
  uniqueIndex("track_leadership_one_active_primary")
    .on(t.trackId)
    .where(sql`${t.leadershipRole} = 'primary' AND ${t.status} = 'active'`),
]);

export const trackApplications = pgTable("track_applications", {
  id: uuid("id").primaryKey(),
  trackId: uuid("track_id").notNull().references(() => tracks.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  requestedRole: text("requested_role").notNull().default("member"),
  wantPrimary: boolean("want_primary").notNull().default(false),
  motivation: text("motivation"),
  status: text("status").notNull().default("submitted"),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  decisionReason: text("decision_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index("track_applications_track_status_idx").on(t.trackId, t.status),
  index("track_applications_user_status_idx").on(t.userId, t.status),
]);

export const trackContributions = pgTable("track_contributions", {
  id: uuid("id").primaryKey(),
  trackId: uuid("track_id").notNull().references(() => tracks.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  contributionType: text("contribution_type").notNull(),
  recognitionContributionId: uuid("recognition_contribution_id").references(() => contributions.id),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  summaryAr: text("summary_ar"),
  summaryEn: text("summary_en"),
  status: text("status").notNull().default("draft"),
  hoursClaimed: numeric("hours_claimed", { precision: 8, scale: 2 }),
  hoursAwarded: numeric("hours_awarded", { precision: 8, scale: 2 }),
  impactAwarded: boolean("impact_awarded").notNull().default(false),
  badgeAwarded: boolean("badge_awarded").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index("track_contributions_track_status_idx").on(t.trackId, t.status),
  index("track_contributions_user_status_idx").on(t.userId, t.status),
]);

export const trackContributionReviews = pgTable("track_contribution_reviews", {
  id: uuid("id").primaryKey(),
  contributionId: uuid("contribution_id").notNull().references(() => trackContributions.id),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("track_contribution_reviews_contribution_idx").on(t.contributionId)]);

export const trackInitiatives = pgTable("track_initiatives", {
  id: uuid("id").primaryKey(),
  trackId: uuid("track_id").notNull().references(() => tracks.id),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  summaryAr: text("summary_ar"),
  summaryEn: text("summary_en"),
  status: text("status").notNull().default("active"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [index("track_initiatives_track_status_idx").on(t.trackId, t.status)]);

export const trackTasks = pgTable("track_tasks", {
  id: uuid("id").primaryKey(),
  trackId: uuid("track_id").notNull().references(() => tracks.id),
  initiativeId: uuid("initiative_id").references(() => trackInitiatives.id),
  assigneeUserId: uuid("assignee_user_id").references(() => users.id),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  status: text("status").notNull().default("open"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
}, (t) => [
  index("track_tasks_track_status_idx").on(t.trackId, t.status),
  index("track_tasks_assignee_idx").on(t.assigneeUserId),
]);

export const trackEvents = pgTable("track_events", {
  id: uuid("id").primaryKey(),
  trackId: uuid("track_id").notNull().references(() => tracks.id),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  summaryAr: text("summary_ar"),
  summaryEn: text("summary_en"),
  eventKind: text("event_kind").notNull().default("workshop"),
  status: text("status").notNull().default("scheduled"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  location: text("location"),
  capacity: integer("capacity"),
  createdBy: uuid("created_by").references(() => users.id),
  ...timestamps,
}, (t) => [index("track_events_track_starts_idx").on(t.trackId, t.startsAt)]);

/** Versioned visual templates. A new active row can replace the design without reissuing credentials. */
export const membershipCardTemplates = pgTable("membership_card_templates", {
  id: uuid("id").primaryKey(),
  membershipTypeId: uuid("membership_type_id").references(() => membershipTypes.id),
  slug: text("slug").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  config: jsonb("config").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  ...timestamps,
}, (t) => [
  uniqueIndex("membership_card_templates_slug_version_unique").on(t.slug, t.version),
  index("membership_card_templates_type_status_idx").on(t.membershipTypeId, t.status),
]);

export const consultationRequests = pgTable("consultation_requests", {
  id: uuid("id").primaryKey(),
  requesterUserId: uuid("requester_user_id").notNull().references(() => users.id),
  trackId: uuid("track_id").references(() => tracks.id),
  assignedExpertUserId: uuid("assigned_expert_user_id").references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  desiredOutcome: text("desired_outcome"),
  urgency: text("urgency").notNull().default("normal"),
  status: text("status").notNull().default("submitted"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index("consultation_requests_requester_status_idx").on(t.requesterUserId, t.status),
  index("consultation_requests_expert_status_idx").on(t.assignedExpertUserId, t.status),
  index("consultation_requests_track_status_idx").on(t.trackId, t.status),
]);

export const consultationMessages = pgTable("consultation_messages", {
  id: uuid("id").primaryKey(),
  requestId: uuid("request_id").notNull().references(() => consultationRequests.id),
  authorUserId: uuid("author_user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  kind: text("kind").notNull().default("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("consultation_messages_request_created_idx").on(t.requestId, t.createdAt)]);

export const meetingRooms = pgTable("meeting_rooms", {
  id: uuid("id").primaryKey(),
  consultationId: uuid("consultation_id").references(() => consultationRequests.id),
  trackId: uuid("track_id").references(() => tracks.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  provider: text("provider").notNull().default("jitsi"),
  roomKey: text("room_key").notNull(),
  status: text("status").notNull().default("scheduled"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  allowAudio: boolean("allow_audio").notNull().default(true),
  allowVideo: boolean("allow_video").notNull().default(true),
  ...timestamps,
}, (t) => [
  uniqueIndex("meeting_rooms_room_key_unique").on(t.roomKey),
  index("meeting_rooms_consultation_idx").on(t.consultationId),
  index("meeting_rooms_starts_idx").on(t.startsAt),
]);

export const supportRequests = pgTable("support_requests", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  replyEmail: text("reply_email").notNull(),
  locale: text("locale").notNull().default("ar"),
  status: text("status").notNull().default("open"),
  ipHash: text("ip_hash"),
  adminNotes: text("admin_notes"),
  ...timestamps,
}, (t) => [
  index("support_requests_status_created_idx").on(t.status, t.createdAt),
  index("support_requests_category_status_idx").on(t.category, t.status),
]);

export const meetingParticipants = pgTable("meeting_participants", {
  id: uuid("id").primaryKey(),
  meetingId: uuid("meeting_id").notNull().references(() => meetingRooms.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("attendee"),
  status: text("status").notNull().default("invited"),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex("meeting_participants_meeting_user_unique").on(t.meetingId, t.userId),
  index("meeting_participants_user_status_idx").on(t.userId, t.status),
]);
