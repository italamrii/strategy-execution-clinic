-- Owner admin bootstrap: idempotently assign super_admin and member roles to owner
-- Email: italamrii@gmail.com
-- Organization: NULL (global roles)
-- Uses INSERT...SELECT...WHERE NOT EXISTS for idempotency
-- Avoids duplicate user_roles through unique constraint and conditional insert

-- Ensure roles exist (should be seeded in 0000, but defensive)
INSERT INTO "roles" ("id", "slug", "name_ar", "name_en", "is_system", "created_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440100', 'super_admin', 'مسؤول عام', 'Super Admin', true, now()),
  ('550e8400-e29b-41d4-a716-446655440101', 'member', 'عضو', 'Member', true, now())
ON CONFLICT DO NOTHING;

-- Assign super_admin role to owner (idempotent via WHERE NOT EXISTS)
INSERT INTO "user_roles" ("id", "user_id", "role_id", "organization_id", "granted_by", "created_at")
SELECT 
  '550e8400-e29b-41d4-a716-446655440102'::uuid AS "id",
  u."id" AS "user_id",
  '550e8400-e29b-41d4-a716-446655440100'::uuid AS "role_id",
  NULL::uuid AS "organization_id",
  NULL::uuid AS "granted_by",
  now() AS "created_at"
FROM "users" u
WHERE u."email" = 'italamrii@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM "user_roles" ur
    WHERE ur."user_id" = u."id"
      AND ur."role_id" = '550e8400-e29b-41d4-a716-446655440100'::uuid
      AND ur."organization_id" IS NULL
  );

-- Assign member role to owner (idempotent via WHERE NOT EXISTS)
INSERT INTO "user_roles" ("id", "user_id", "role_id", "organization_id", "granted_by", "created_at")
SELECT 
  '550e8400-e29b-41d4-a716-446655440103'::uuid AS "id",
  u."id" AS "user_id",
  '550e8400-e29b-41d4-a716-446655440101'::uuid AS "role_id",
  NULL::uuid AS "organization_id",
  NULL::uuid AS "granted_by",
  now() AS "created_at"
FROM "users" u
WHERE u."email" = 'italamrii@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM "user_roles" ur
    WHERE ur."user_id" = u."id"
      AND ur."role_id" = '550e8400-e29b-41d4-a716-446655440101'::uuid
      AND ur."organization_id" IS NULL
  );

