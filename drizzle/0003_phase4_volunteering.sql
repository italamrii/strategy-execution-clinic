-- Phase 4: Volunteer Operating System extensions

ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "availability" jsonb;
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "preferred_tracks" jsonb;
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "skills" jsonb;
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "interests" jsonb;
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "location_preference" text;
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "progression_level" text DEFAULT 'volunteer' NOT NULL;

ALTER TABLE "volunteer_opportunity_applications" ADD COLUMN IF NOT EXISTS "motivation" text;
ALTER TABLE "volunteer_opportunity_applications" ADD COLUMN IF NOT EXISTS "relevant_experience" text;
ALTER TABLE "volunteer_opportunity_applications" ADD COLUMN IF NOT EXISTS "availability_note" text;
ALTER TABLE "volunteer_opportunity_applications" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp with time zone;
UPDATE "volunteer_opportunity_applications" SET "status" = 'submitted' WHERE "status" = 'applied';
UPDATE "volunteer_opportunity_applications" SET "submitted_at" = "created_at" WHERE "submitted_at" IS NULL;

ALTER TABLE "volunteer_opportunities" ADD COLUMN IF NOT EXISTS "city" text;

ALTER TABLE "volunteer_hour_entries" ADD COLUMN IF NOT EXISTS "participation_id" uuid;
ALTER TABLE "volunteer_hour_entries" ADD COLUMN IF NOT EXISTS "activity_date" date;
ALTER TABLE "volunteer_hour_entries" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "volunteer_hour_entries" ADD COLUMN IF NOT EXISTS "submitted_by" uuid;
ALTER TABLE "volunteer_hour_entries" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "volunteer_participations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"volunteer_profile_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'accepted' NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"attendance_status" text DEFAULT 'pending' NOT NULL,
	"organizer_user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "volunteer_attendance" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participation_id" uuid NOT NULL,
	"status" text NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "volunteer_level_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"volunteer_profile_id" uuid NOT NULL,
	"from_level" text NOT NULL,
	"to_level" text NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "volunteer_participations" ADD CONSTRAINT "volunteer_participations_opportunity_id_volunteer_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."volunteer_opportunities"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "volunteer_participations" ADD CONSTRAINT "volunteer_participations_volunteer_profile_id_volunteer_profiles_id_fk" FOREIGN KEY ("volunteer_profile_id") REFERENCES "public"."volunteer_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "volunteer_participations" ADD CONSTRAINT "volunteer_participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "volunteer_participations" ADD CONSTRAINT "volunteer_participations_organizer_user_id_users_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "volunteer_attendance" ADD CONSTRAINT "volunteer_attendance_participation_id_volunteer_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."volunteer_participations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "volunteer_attendance" ADD CONSTRAINT "volunteer_attendance_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "volunteer_level_history" ADD CONSTRAINT "volunteer_level_history_volunteer_profile_id_volunteer_profiles_id_fk" FOREIGN KEY ("volunteer_profile_id") REFERENCES "public"."volunteer_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "volunteer_level_history" ADD CONSTRAINT "volunteer_level_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "volunteer_hour_entries" ADD CONSTRAINT "volunteer_hour_entries_participation_id_volunteer_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."volunteer_participations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "volunteer_hour_entries" ADD CONSTRAINT "volunteer_hour_entries_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "volunteer_participations_unique" ON "volunteer_participations" USING btree ("opportunity_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_participations_volunteer_idx" ON "volunteer_participations" USING btree ("volunteer_profile_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_participations_status_idx" ON "volunteer_participations" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_opportunities_status_idx" ON "volunteer_opportunities" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_opportunities_track_idx" ON "volunteer_opportunities" USING btree ("track_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_opportunity_applications_status_idx" ON "volunteer_opportunity_applications" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_hour_entries_activity_date_idx" ON "volunteer_hour_entries" USING btree ("activity_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_hour_entries_opportunity_idx" ON "volunteer_hour_entries" USING btree ("opportunity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "impact_events_user_kind_idx" ON "impact_events" USING btree ("user_id","kind");
