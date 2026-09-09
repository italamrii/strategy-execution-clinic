ALTER TABLE "tracks" ADD COLUMN "purpose_ar" text;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "purpose_en" text;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "scope_ar" text;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "scope_en" text;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "icon_key" text DEFAULT 'track' NOT NULL;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "applications_open" boolean DEFAULT true NOT NULL;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "allow_secondary" boolean DEFAULT true NOT NULL;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "max_secondary" integer DEFAULT 2 NOT NULL;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "archived_at" timestamp with time zone;-->statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "suspended_at" timestamp with time zone;-->statement-breakpoint
CREATE TABLE "track_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"track_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"membership_id" uuid,
	"role" text DEFAULT 'member' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"source" text DEFAULT 'application' NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-->statement-breakpoint
CREATE TABLE "track_leadership_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"track_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"leadership_role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"appointed_by" uuid,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-->statement-breakpoint
CREATE TABLE "track_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"track_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"requested_role" text DEFAULT 'member' NOT NULL,
	"want_primary" boolean DEFAULT false NOT NULL,
	"motivation" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"reviewer_id" uuid,
	"decision_reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-->statement-breakpoint
CREATE TABLE "track_contributions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"track_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"contribution_type" text NOT NULL,
	"recognition_contribution_id" uuid,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"summary_ar" text,
	"summary_en" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"hours_claimed" numeric(8, 2),
	"hours_awarded" numeric(8, 2),
	"impact_awarded" boolean DEFAULT false NOT NULL,
	"badge_awarded" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-->statement-breakpoint
CREATE TABLE "track_contribution_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"contribution_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-->statement-breakpoint
CREATE TABLE "track_initiatives" (
	"id" uuid PRIMARY KEY NOT NULL,
	"track_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"summary_ar" text,
	"summary_en" text,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-->statement-breakpoint
CREATE TABLE "track_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"track_id" uuid NOT NULL,
	"initiative_id" uuid,
	"assignee_user_id" uuid,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"status" text DEFAULT 'open' NOT NULL,
	"due_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-->statement-breakpoint
CREATE TABLE "track_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"track_id" uuid NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"summary_ar" text,
	"summary_en" text,
	"event_kind" text DEFAULT 'workshop' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"location" text,
	"capacity" integer,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-->statement-breakpoint
ALTER TABLE "track_memberships" ADD CONSTRAINT "track_memberships_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_memberships" ADD CONSTRAINT "track_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_memberships" ADD CONSTRAINT "track_memberships_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_memberships" ADD CONSTRAINT "track_memberships_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_leadership_assignments" ADD CONSTRAINT "track_leadership_assignments_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_leadership_assignments" ADD CONSTRAINT "track_leadership_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_leadership_assignments" ADD CONSTRAINT "track_leadership_assignments_appointed_by_users_id_fk" FOREIGN KEY ("appointed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_applications" ADD CONSTRAINT "track_applications_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_applications" ADD CONSTRAINT "track_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_applications" ADD CONSTRAINT "track_applications_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_contributions" ADD CONSTRAINT "track_contributions_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_contributions" ADD CONSTRAINT "track_contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_contributions" ADD CONSTRAINT "track_contributions_recognition_contribution_id_contributions_id_fk" FOREIGN KEY ("recognition_contribution_id") REFERENCES "public"."contributions"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_contribution_reviews" ADD CONSTRAINT "track_contribution_reviews_contribution_id_track_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."track_contributions"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_contribution_reviews" ADD CONSTRAINT "track_contribution_reviews_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_initiatives" ADD CONSTRAINT "track_initiatives_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_initiatives" ADD CONSTRAINT "track_initiatives_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_tasks" ADD CONSTRAINT "track_tasks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_tasks" ADD CONSTRAINT "track_tasks_initiative_id_track_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."track_initiatives"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_tasks" ADD CONSTRAINT "track_tasks_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_tasks" ADD CONSTRAINT "track_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_events" ADD CONSTRAINT "track_events_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
ALTER TABLE "track_events" ADD CONSTRAINT "track_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;-->statement-breakpoint
CREATE UNIQUE INDEX "track_memberships_track_user_unique" ON "track_memberships" USING btree ("track_id","user_id");-->statement-breakpoint
CREATE INDEX "track_memberships_user_status_idx" ON "track_memberships" USING btree ("user_id","status");-->statement-breakpoint
CREATE INDEX "track_memberships_track_status_idx" ON "track_memberships" USING btree ("track_id","status");-->statement-breakpoint
CREATE UNIQUE INDEX "track_memberships_one_primary_per_user" ON "track_memberships" USING btree ("user_id") WHERE "is_primary" = true AND "status" = 'active';-->statement-breakpoint
CREATE INDEX "track_leadership_track_status_idx" ON "track_leadership_assignments" USING btree ("track_id","status");-->statement-breakpoint
CREATE INDEX "track_leadership_user_idx" ON "track_leadership_assignments" USING btree ("user_id");-->statement-breakpoint
CREATE UNIQUE INDEX "track_leadership_one_active_primary" ON "track_leadership_assignments" USING btree ("track_id") WHERE "leadership_role" = 'primary' AND "status" = 'active';-->statement-breakpoint
CREATE INDEX "track_applications_track_status_idx" ON "track_applications" USING btree ("track_id","status");-->statement-breakpoint
CREATE INDEX "track_applications_user_status_idx" ON "track_applications" USING btree ("user_id","status");-->statement-breakpoint
CREATE INDEX "track_contributions_track_status_idx" ON "track_contributions" USING btree ("track_id","status");-->statement-breakpoint
CREATE INDEX "track_contributions_user_status_idx" ON "track_contributions" USING btree ("user_id","status");-->statement-breakpoint
CREATE INDEX "track_contribution_reviews_contribution_idx" ON "track_contribution_reviews" USING btree ("contribution_id");-->statement-breakpoint
CREATE INDEX "track_initiatives_track_status_idx" ON "track_initiatives" USING btree ("track_id","status");-->statement-breakpoint
CREATE INDEX "track_tasks_track_status_idx" ON "track_tasks" USING btree ("track_id","status");-->statement-breakpoint
CREATE INDEX "track_tasks_assignee_idx" ON "track_tasks" USING btree ("assignee_user_id");-->statement-breakpoint
CREATE INDEX "track_events_track_starts_idx" ON "track_events" USING btree ("track_id","starts_at");
