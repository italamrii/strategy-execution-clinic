ALTER TABLE "credentials" ADD COLUMN "design_version" text DEFAULT 'CARD_DESIGN_V1' NOT NULL;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "issuance_source" text;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credentials_status_idx" ON "credentials" USING btree ("status");--> statement-breakpoint
ALTER TABLE "credential_status_history" ADD COLUMN "source" text;--> statement-breakpoint
CREATE INDEX "credential_status_history_credential_idx" ON "credential_status_history" USING btree ("credential_id");--> statement-breakpoint
ALTER TABLE "credential_assets" DROP COLUMN "media_id";--> statement-breakpoint
ALTER TABLE "credential_assets" ADD COLUMN "design_version" text DEFAULT 'CARD_DESIGN_V1' NOT NULL;--> statement-breakpoint
ALTER TABLE "credential_assets" ADD COLUMN "content_hash" text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE "credential_assets" ADD COLUMN "storage_key" text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE "credential_assets" ADD COLUMN "mime" text NOT NULL DEFAULT 'application/octet-stream';--> statement-breakpoint
ALTER TABLE "credential_assets" ADD COLUMN "bytes" integer NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE UNIQUE INDEX "credential_assets_unique" ON "credential_assets" USING btree ("credential_id","kind","locale","design_version","content_hash");--> statement-breakpoint
CREATE INDEX "credential_assets_credential_idx" ON "credential_assets" USING btree ("credential_id");
