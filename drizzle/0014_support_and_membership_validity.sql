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

-- One-year default for untouched factory seed rows from 0011 only.
-- Does not overwrite administrator-configured lifetime policies.
--
-- Updated when all of the following are true:
--   id is a 0011 factory UUID
--   slug is a non-lifetime factory type
--   validity_mode is still the 0011 default ('lifetime')
--   validity_days is still NULL
--   renewal_required is still the 0011 default (false)
--   updated_at is within 5s of created_at (row was never saved again)
--
-- Affected factory rows:
--   550e8400-e29b-41d4-a716-446655440002 expert_member
--   550e8400-e29b-41d4-a716-446655440003 professional_member
--   550e8400-e29b-41d4-a716-446655440004 contributor
--   550e8400-e29b-41d4-a716-446655440005 volunteer_member
--   550e8400-e29b-41d4-a716-446655440006 volunteer_leader
--   550e8400-e29b-41d4-a716-446655440007 distinguished_volunteer
--
-- Not updated (remain lifetime):
--   550e8400-e29b-41d4-a716-446655440001 founding_member
--   550e8400-e29b-41d4-a716-446655440008 strategic_partner
--   550e8400-e29b-41d4-a716-446655440009 institutional_member
--
-- Deployment: this file is new in PR #6. If an earlier draft of 0014 already
-- ran in a local database, reset that database or skip this checksum change.
-- Production at 8ca08cf has not applied 0014.

UPDATE "membership_types"
SET
  "validity_mode" = 'fixed_days',
  "validity_days" = 365,
  "renewal_required" = true,
  "updated_at" = now()
WHERE "id" IN (
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440007'
)
  AND "validity_mode" = 'lifetime'
  AND "validity_days" IS NULL
  AND "renewal_required" = false
  AND "updated_at" <= "created_at" + interval '5 seconds';
