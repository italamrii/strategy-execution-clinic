-- Phase 5: Impact, recognition, badges, certificates, contributions, public profile

CREATE TABLE IF NOT EXISTS "contribution_types" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"requires_review" boolean DEFAULT true NOT NULL,
	"impact_weight" numeric(8, 2) DEFAULT '10' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contribution_types_slug_unique" ON "contribution_types" USING btree ("slug");
--> statement-breakpoint

ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "contribution_type_id" uuid;
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "description_ar" text;
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp with time zone;
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'member_submission';
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "related_opportunity_id" uuid;
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "evidence_media_id" uuid;
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'private';
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "submitted_by" uuid;
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "review_notes" text;
ALTER TABLE "contributions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
UPDATE "contributions" SET "status" = 'submitted' WHERE "status" = 'pending';

ALTER TABLE "badge_definitions" ADD COLUMN IF NOT EXISTS "criteria_ar" text;
ALTER TABLE "badge_definitions" ADD COLUMN IF NOT EXISTS "criteria_en" text;
ALTER TABLE "badge_definitions" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "badge_definitions" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true NOT NULL;
ALTER TABLE "badge_definitions" ADD COLUMN IF NOT EXISTS "issuance_mode" text DEFAULT 'manual' NOT NULL;
ALTER TABLE "badge_definitions" ADD COLUMN IF NOT EXISTS "expiration_mode" text DEFAULT 'none' NOT NULL;
ALTER TABLE "badge_definitions" ADD COLUMN IF NOT EXISTS "design_version" text DEFAULT 'BADGE_DESIGN_V1' NOT NULL;
ALTER TABLE "badge_definitions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

ALTER TABLE "badge_awards" ADD COLUMN IF NOT EXISTS "public_code" text;
ALTER TABLE "badge_awards" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "badge_awards" ADD COLUMN IF NOT EXISTS "source_type" text;
ALTER TABLE "badge_awards" ADD COLUMN IF NOT EXISTS "source_id" uuid;
ALTER TABLE "badge_awards" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "badge_awards" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "badge_awards_public_code_unique" ON "badge_awards" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "badge_awards_active_unique" ON "badge_awards" USING btree ("badge_definition_id","user_id") WHERE "status" = 'active' AND "revoked_at" IS NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "certificate_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_requirement" text NOT NULL,
	"template_version" text DEFAULT 'CERTIFICATE_DESIGN_V1' NOT NULL,
	"expiration_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificate_definitions_slug_unique" ON "certificate_definitions" USING btree ("slug");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "certificates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"definition_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"public_code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"issued_by" uuid,
	"template_version" text DEFAULT 'CERTIFICATE_DESIGN_V1' NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_public_code_unique" ON "certificates" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_source_unique" ON "certificates" USING btree ("definition_id","source_type","source_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificates_user_idx" ON "certificates" USING btree ("user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_milestones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"threshold" integer NOT NULL,
	"achieved_at" timestamp with time zone NOT NULL,
	"source_total" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_milestones_unique" ON "member_milestones" USING btree ("user_id","kind","threshold");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "public_profile_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"show_photo" boolean DEFAULT true NOT NULL,
	"show_headline" boolean DEFAULT true NOT NULL,
	"show_biography" boolean DEFAULT true NOT NULL,
	"show_tracks" boolean DEFAULT true NOT NULL,
	"show_volunteer_hours" boolean DEFAULT false NOT NULL,
	"show_impact_score" boolean DEFAULT false NOT NULL,
	"show_contributions" boolean DEFAULT true NOT NULL,
	"show_badges" boolean DEFAULT true NOT NULL,
	"show_certificates" boolean DEFAULT true NOT NULL,
	"public_handle" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "public_profile_settings_user_unique" ON "public_profile_settings" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "public_profile_settings_handle_unique" ON "public_profile_settings" USING btree ("public_handle");
--> statement-breakpoint

ALTER TABLE "certificates" ADD CONSTRAINT "certificates_definition_id_certificate_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."certificate_definitions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "member_milestones" ADD CONSTRAINT "member_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public_profile_settings" ADD CONSTRAINT "public_profile_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_contribution_type_id_contribution_types_id_fk" FOREIGN KEY ("contribution_type_id") REFERENCES "public"."contribution_types"("id") ON DELETE no action ON UPDATE no action;
