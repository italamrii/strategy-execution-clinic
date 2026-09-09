-- Idempotent RBAC catalog completion and assignment uniqueness.
-- Resolves roles/permissions by slug. Does not hardcode user emails.

DELETE FROM "user_roles" a
USING "user_roles" b
WHERE a.ctid < b.ctid
  AND a."user_id" = b."user_id"
  AND a."role_id" = b."role_id"
  AND a."organization_id" IS NULL
  AND b."organization_id" IS NULL;

DELETE FROM "user_roles" a
USING "user_roles" b
WHERE a.ctid < b.ctid
  AND a."user_id" = b."user_id"
  AND a."role_id" = b."role_id"
  AND a."organization_id" IS NOT NULL
  AND a."organization_id" = b."organization_id";

CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_role_global_unique"
  ON "user_roles" ("user_id", "role_id")
  WHERE "organization_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_role_org_unique"
  ON "user_roles" ("user_id", "role_id", "organization_id")
  WHERE "organization_id" IS NOT NULL;

INSERT INTO "roles" ("id", "slug", "name_ar", "name_en", "is_system", "created_at")
SELECT gen_random_uuid(), v.slug, v.name_ar, v.name_en, true, now()
FROM (
  VALUES
    ('expert', 'خبير', 'Expert'),
    ('founder', 'مؤسس', 'Founder'),
    ('volunteer', 'متطوع', 'Volunteer')
) AS v(slug, name_ar, name_en)
WHERE NOT EXISTS (SELECT 1 FROM "roles" r WHERE r."slug" = v.slug);

INSERT INTO "permissions" ("id", "slug", "description")
SELECT gen_random_uuid(), v.slug, v.slug
FROM (
  VALUES
    ('admin.settings.manage'),
    ('membership.manage'),
    ('volunteer.manage'),
    ('meeting.start'),
    ('card.read.own'),
    ('card.template.manage'),
    ('track.member.manage')
) AS v(slug)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."slug" = v.slug);
