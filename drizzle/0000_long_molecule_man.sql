CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"request_id" text,
	"reason" text,
	"before" jsonb,
	"after" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_magic_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_otp_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"purpose" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"request_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badge_awards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"badge_definition_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"evidence" jsonb,
	"issuer_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "badge_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"issuer_name" text NOT NULL,
	"criteria" jsonb,
	"open_badges_json" jsonb,
	"image_media_id" uuid,
	"expires_after_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"granted" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"credential_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"media_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_status_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"credential_id" uuid NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"membership_id" uuid NOT NULL,
	"public_code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"payload" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"source_table" text NOT NULL,
	"source_id" uuid NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_kind" text NOT NULL,
	"weight" numeric(8, 2) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"mime" text NOT NULL,
	"byte_size" integer NOT NULL,
	"checksum" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_tracks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"membership_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"membership_type_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"payload" jsonb,
	"reviewer_id" uuid,
	"decision_reason" text,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_types" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"applications_open" boolean DEFAULT true NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"card_design" jsonb,
	"application_schema" jsonb,
	"workflow" jsonb,
	"entitlements" jsonb,
	"expiration_policy" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"membership_type_id" uuid NOT NULL,
	"application_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"issued_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"channel" text NOT NULL,
	"template" text NOT NULL,
	"payload" jsonb,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"org_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"legal_name" text,
	"phone_e164" text,
	"phone_verified_at" timestamp with time zone,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name_ar" text NOT NULL,
	"display_name_en" text,
	"headline_ar" text,
	"headline_en" text,
	"bio_ar" text,
	"bio_en" text,
	"photo_media_id" uuid,
	"city" text,
	"country" text DEFAULT 'SA',
	"visibility" text DEFAULT 'private' NOT NULL,
	"hours_public" boolean DEFAULT false NOT NULL,
	"directory_opt_in" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bucket_key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"user_id" uuid,
	"request_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"rotated_from" uuid,
	"ip_hash" text,
	"user_agent_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"card_accent" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"organization_id" uuid,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"locale" text DEFAULT 'ar' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"disabled_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_hour_adjustments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"hour_entry_id" uuid,
	"delta_hours" numeric(6, 2) NOT NULL,
	"reason" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_hour_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"session_id" uuid,
	"hours" numeric(6, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text NOT NULL,
	"evidence_media_id" uuid,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_opportunities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"track_id" uuid,
	"required_skills" jsonb,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"location_type" text DEFAULT 'remote' NOT NULL,
	"location_text_ar" text,
	"location_text_en" text,
	"max_participants" integer,
	"expected_hours" numeric(6, 2),
	"organizer_user_id" uuid,
	"application_deadline" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_opportunity_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL,
	"reviewer_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"approved_hours_cache" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pending_hours_cache" numeric(10, 2) DEFAULT '0' NOT NULL,
	"impact_score_cache" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_progression_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"predicate" jsonb NOT NULL,
	"target_membership_type_id" uuid,
	"is_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webauthn_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"transports" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD CONSTRAINT "auth_magic_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_otp_challenges" ADD CONSTRAINT "auth_otp_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_badge_definition_id_badge_definitions_id_fk" FOREIGN KEY ("badge_definition_id") REFERENCES "public"."badge_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_issuer_user_id_users_id_fk" FOREIGN KEY ("issuer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_assets" ADD CONSTRAINT "credential_assets_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_status_history" ADD CONSTRAINT "credential_status_history_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_status_history" ADD CONSTRAINT "credential_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_events" ADD CONSTRAINT "impact_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_tracks" ADD CONSTRAINT "member_tracks_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_tracks" ADD CONSTRAINT "member_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_membership_type_id_membership_types_id_fk" FOREIGN KEY ("membership_type_id") REFERENCES "public"."membership_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_membership_type_id_membership_types_id_fk" FOREIGN KEY ("membership_type_id") REFERENCES "public"."membership_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_application_id_membership_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."membership_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_contacts" ADD CONSTRAINT "profile_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hour_adjustments" ADD CONSTRAINT "volunteer_hour_adjustments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hour_adjustments" ADD CONSTRAINT "volunteer_hour_adjustments_hour_entry_id_volunteer_hour_entries_id_fk" FOREIGN KEY ("hour_entry_id") REFERENCES "public"."volunteer_hour_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hour_adjustments" ADD CONSTRAINT "volunteer_hour_adjustments_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hour_entries" ADD CONSTRAINT "volunteer_hour_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hour_entries" ADD CONSTRAINT "volunteer_hour_entries_opportunity_id_volunteer_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."volunteer_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hour_entries" ADD CONSTRAINT "volunteer_hour_entries_session_id_volunteer_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."volunteer_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hour_entries" ADD CONSTRAINT "volunteer_hour_entries_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_opportunities" ADD CONSTRAINT "volunteer_opportunities_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_opportunities" ADD CONSTRAINT "volunteer_opportunities_organizer_user_id_users_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_opportunity_applications" ADD CONSTRAINT "volunteer_opportunity_applications_opportunity_id_volunteer_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."volunteer_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_opportunity_applications" ADD CONSTRAINT "volunteer_opportunity_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_opportunity_applications" ADD CONSTRAINT "volunteer_opportunity_applications_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_progression_rules" ADD CONSTRAINT "volunteer_progression_rules_target_membership_type_id_membership_types_id_fk" FOREIGN KEY ("target_membership_type_id") REFERENCES "public"."membership_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_sessions" ADD CONSTRAINT "volunteer_sessions_opportunity_id_volunteer_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."volunteer_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_sessions" ADD CONSTRAINT "volunteer_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "auth_otp_challenges_email_created_idx" ON "auth_otp_challenges" USING btree ("email","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "badge_definitions_slug_unique" ON "badge_definitions" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "credentials_membership_unique" ON "credentials" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credentials_public_code_unique" ON "credentials" USING btree ("public_code");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_key_unique" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "member_tracks_unique" ON "member_tracks" USING btree ("membership_id","track_id");--> statement-breakpoint
CREATE INDEX "membership_applications_user_status_idx" ON "membership_applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "membership_applications_status_submitted_idx" ON "membership_applications" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_types_slug_unique" ON "membership_types" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_types_code_unique" ON "membership_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "memberships_user_status_idx" ON "memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_slug_unique" ON "permissions" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_contacts_user_id_unique" ON "profile_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_unique" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_buckets_key_window_unique" ON "rate_limit_buckets" USING btree ("bucket_key","window_start");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_unique" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_slug_unique" ON "roles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_key_unique" ON "system_settings" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_code_unique" ON "tracks" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_slug_unique" ON "tracks" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "volunteer_hour_entries_user_status_idx" ON "volunteer_hour_entries" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "volunteer_opportunity_applications_unique" ON "volunteer_opportunity_applications" USING btree ("opportunity_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "volunteer_profiles_user_unique" ON "volunteer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webauthn_credential_id_unique" ON "webauthn_credentials" USING btree ("credential_id");