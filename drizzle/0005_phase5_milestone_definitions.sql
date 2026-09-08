CREATE TABLE IF NOT EXISTS "milestone_definitions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "threshold" integer NOT NULL,
  "name_ar" text NOT NULL,
  "name_en" text NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "milestone_definitions_kind_threshold_unique"
  ON "milestone_definitions" ("kind", "threshold");
