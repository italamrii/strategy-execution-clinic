CREATE TABLE IF NOT EXISTS "support_requests" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid REFERENCES "users"("id"),
  "category" text NOT NULL,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "reply_email" text NOT NULL,
  "locale" text NOT NULL DEFAULT 'ar',
  "status" text NOT NULL DEFAULT 'open',
  "ip_hash" text,
  "admin_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "support_requests_status_created_idx"
  ON "support_requests" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "support_requests_category_status_idx"
  ON "support_requests" ("category", "status");

-- Factory lifetime types without an explicit policy become one-year memberships.
-- Founding, partner, and institutional types keep lifetime validity.
UPDATE "membership_types"
SET
  "validity_mode" = 'fixed_days',
  "validity_days" = 365,
  "renewal_required" = true,
  "updated_at" = now()
WHERE "slug" NOT IN ('founding_member', 'strategic_partner', 'institutional_member')
  AND "validity_mode" = 'lifetime'
  AND "validity_days" IS NULL;
