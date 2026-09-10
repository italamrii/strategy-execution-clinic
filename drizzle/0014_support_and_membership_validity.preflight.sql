-- Read-only. Lists membership_types rows the 0014 UPDATE would modify.
-- Does not apply changes. Run via `pnpm preflight:0014` before migrating.
--
-- The 5-second updated_at window is a conservative filter for likely-unedited
-- factory seed rows. It is not proof that a row was never edited: seed can set
-- created_at and updated_at together, and an administrator save within 5
-- seconds would still match.

SELECT
  "id",
  "slug",
  "name_en",
  "validity_mode",
  "validity_days",
  "renewal_required",
  "created_at",
  "updated_at"
FROM "membership_types"
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
