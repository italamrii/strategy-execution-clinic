-- Owner admin bootstrap: idempotently assign super_admin and member roles to owner
-- Email: italamrii@gmail.com
-- Organization: NULL (global roles)
-- Uses INSERT...SELECT...WHERE NOT EXISTS for idempotency
-- Joins on existing roles by slug; does NOT insert roles
-- Fixed UUIDs used only for the two new user_roles row IDs

-- Assign super_admin role to owner (idempotent via WHERE NOT EXISTS)
INSERT INTO "user_roles" ("id", "user_id", "role_id", "organization_id", "granted_by", "created_at")
SELECT 
  '550e8400-e29b-41d4-a716-446655440102'::uuid AS "id",
  u."id" AS "user_id",
  r."id" AS "role_id",
  NULL::uuid AS "organization_id",
  NULL::uuid AS "granted_by",
  now() AS "created_at"
FROM "users" u
CROSS JOIN "roles" r
WHERE lower(u."email") = lower('italamrii@gmail.com')
  AND r."slug" = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM "user_roles" ur
    WHERE ur."user_id" = u."id"
      AND ur."role_id" = r."id"
      AND ur."organization_id" IS NULL
  );

-- Assign member role to owner (idempotent via WHERE NOT EXISTS)
INSERT INTO "user_roles" ("id", "user_id", "role_id", "organization_id", "granted_by", "created_at")
SELECT 
  '550e8400-e29b-41d4-a716-446655440103'::uuid AS "id",
  u."id" AS "user_id",
  r."id" AS "role_id",
  NULL::uuid AS "organization_id",
  NULL::uuid AS "granted_by",
  now() AS "created_at"
FROM "users" u
CROSS JOIN "roles" r
WHERE lower(u."email") = lower('italamrii@gmail.com')
  AND r."slug" = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM "user_roles" ur
    WHERE ur."user_id" = u."id"
      AND ur."role_id" = r."id"
      AND ur."organization_id" IS NULL
  );

