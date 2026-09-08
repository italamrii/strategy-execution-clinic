CREATE TABLE "membership_application_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"reason" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_application_tracks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"source" text DEFAULT 'applicant' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_status_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"membership_id" uuid NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "membership_applications" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD COLUMN "motivation" text;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD COLUMN "experience" text;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD COLUMN "portfolio_url" text;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD COLUMN "github_url" text;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD COLUMN "additional_notes" text;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD COLUMN "internal_notes" text;--> statement-breakpoint
ALTER TABLE "membership_types" ADD COLUMN "invitation_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "membership_types" ADD COLUMN "validity_mode" text DEFAULT 'lifetime' NOT NULL;--> statement-breakpoint
ALTER TABLE "membership_types" ADD COLUMN "validity_days" integer;--> statement-breakpoint
ALTER TABLE "membership_types" ADD COLUMN "renewal_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "issued_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "issue_reason" text;--> statement-breakpoint
ALTER TABLE "membership_application_reviews" ADD CONSTRAINT "membership_application_reviews_application_id_membership_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."membership_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_application_reviews" ADD CONSTRAINT "membership_application_reviews_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_application_tracks" ADD CONSTRAINT "membership_application_tracks_application_id_membership_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."membership_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_application_tracks" ADD CONSTRAINT "membership_application_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_status_history" ADD CONSTRAINT "membership_status_history_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_status_history" ADD CONSTRAINT "membership_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_application_reviews_app_idx" ON "membership_application_reviews" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_application_tracks_unique" ON "membership_application_tracks" USING btree ("application_id","track_id");--> statement-breakpoint
CREATE INDEX "membership_application_tracks_app_idx" ON "membership_application_tracks" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "membership_status_history_membership_idx" ON "membership_status_history" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "membership_applications_type_status_idx" ON "membership_applications" USING btree ("membership_type_id","status");--> statement-breakpoint
CREATE INDEX "memberships_type_status_idx" ON "memberships" USING btree ("membership_type_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_one_active_per_type" ON "memberships" USING btree ("user_id","membership_type_id") WHERE "memberships"."status" = 'active';