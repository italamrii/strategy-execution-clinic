CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id" uuid PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "recipient_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "channel" text NOT NULL,
  "payload" jsonb NOT NULL,
  "payload_version" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "last_error_sanitized" text,
  "idempotency_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_outbox_idempotency_unique"
  ON "notification_outbox" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "notification_outbox_status_available_idx"
  ON "notification_outbox" ("status", "available_at");

CREATE TABLE IF NOT EXISTS "in_app_notifications" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "event_type" text NOT NULL,
  "category" text NOT NULL,
  "title_ar" text NOT NULL,
  "title_en" text NOT NULL,
  "body_ar" text NOT NULL,
  "body_en" text NOT NULL,
  "link_path" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "in_app_notifications_user_created_idx"
  ON "in_app_notifications" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "in_app_notifications_user_unread_idx"
  ON "in_app_notifications" ("user_id", "read_at");

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "category" text NOT NULL,
  "channel" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "is_required" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_unique"
  ON "notification_preferences" ("user_id", "category", "channel");

CREATE TABLE IF NOT EXISTS "content_blocks" (
  "id" uuid PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "kind" text NOT NULL,
  "title_ar" text NOT NULL,
  "title_en" text NOT NULL,
  "body_ar" text NOT NULL,
  "body_en" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "published_at" timestamp with time zone,
  "updated_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "content_blocks_slug_unique" ON "content_blocks" ("slug");
CREATE INDEX IF NOT EXISTS "content_blocks_kind_status_idx" ON "content_blocks" ("kind", "status");

CREATE TABLE IF NOT EXISTS "announcements" (
  "id" uuid PRIMARY KEY NOT NULL,
  "title_ar" text NOT NULL,
  "title_en" text NOT NULL,
  "body_ar" text NOT NULL,
  "body_en" text NOT NULL,
  "audience" text NOT NULL,
  "severity" text DEFAULT 'info' NOT NULL,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone,
  "cta_label_ar" text,
  "cta_label_en" text,
  "cta_path" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "announcements_active_idx"
  ON "announcements" ("status", "start_at", "end_at");

CREATE INDEX IF NOT EXISTS "security_events_kind_created_idx"
  ON "security_events" ("kind", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_idx"
  ON "audit_logs" ("action", "created_at");
