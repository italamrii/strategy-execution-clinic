ALTER TABLE "profile_contacts" ADD COLUMN IF NOT EXISTS "sharing_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "profile_contacts" ADD COLUMN IF NOT EXISTS "sharing_scope" text DEFAULT 'private' NOT NULL;

CREATE TABLE IF NOT EXISTS "membership_card_templates" (
  "id" uuid PRIMARY KEY NOT NULL,
  "membership_type_id" uuid REFERENCES "membership_types"("id"),
  "slug" text NOT NULL,
  "name_ar" text NOT NULL,
  "name_en" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "config" jsonb NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "membership_card_templates_slug_version_unique" ON "membership_card_templates" ("slug", "version");
CREATE INDEX IF NOT EXISTS "membership_card_templates_type_status_idx" ON "membership_card_templates" ("membership_type_id", "status");

CREATE TABLE IF NOT EXISTS "consultation_requests" (
  "id" uuid PRIMARY KEY NOT NULL,
  "requester_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "track_id" uuid REFERENCES "tracks"("id"),
  "assigned_expert_user_id" uuid REFERENCES "users"("id"),
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "desired_outcome" text,
  "urgency" text DEFAULT 'normal' NOT NULL,
  "status" text DEFAULT 'submitted' NOT NULL,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "accepted_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "consultation_requests_requester_status_idx" ON "consultation_requests" ("requester_user_id", "status");
CREATE INDEX IF NOT EXISTS "consultation_requests_expert_status_idx" ON "consultation_requests" ("assigned_expert_user_id", "status");
CREATE INDEX IF NOT EXISTS "consultation_requests_track_status_idx" ON "consultation_requests" ("track_id", "status");

CREATE TABLE IF NOT EXISTS "consultation_messages" (
  "id" uuid PRIMARY KEY NOT NULL,
  "request_id" uuid NOT NULL REFERENCES "consultation_requests"("id"),
  "author_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "body" text NOT NULL,
  "kind" text DEFAULT 'message' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "consultation_messages_request_created_idx" ON "consultation_messages" ("request_id", "created_at");

CREATE TABLE IF NOT EXISTS "meeting_rooms" (
  "id" uuid PRIMARY KEY NOT NULL,
  "consultation_id" uuid REFERENCES "consultation_requests"("id"),
  "track_id" uuid REFERENCES "tracks"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "title" text NOT NULL,
  "provider" text DEFAULT 'jitsi' NOT NULL,
  "room_key" text NOT NULL,
  "status" text DEFAULT 'scheduled' NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone,
  "allow_audio" boolean DEFAULT true NOT NULL,
  "allow_video" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_rooms_room_key_unique" ON "meeting_rooms" ("room_key");
CREATE INDEX IF NOT EXISTS "meeting_rooms_consultation_idx" ON "meeting_rooms" ("consultation_id");
CREATE INDEX IF NOT EXISTS "meeting_rooms_starts_idx" ON "meeting_rooms" ("starts_at");

CREATE TABLE IF NOT EXISTS "meeting_participants" (
  "id" uuid PRIMARY KEY NOT NULL,
  "meeting_id" uuid NOT NULL REFERENCES "meeting_rooms"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "role" text DEFAULT 'attendee' NOT NULL,
  "status" text DEFAULT 'invited' NOT NULL,
  "joined_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_participants_meeting_user_unique" ON "meeting_participants" ("meeting_id", "user_id");
CREATE INDEX IF NOT EXISTS "meeting_participants_user_status_idx" ON "meeting_participants" ("user_id", "status");

INSERT INTO "membership_card_templates" ("id", "slug", "name_ar", "name_en", "version", "status", "config")
VALUES (
  '01999990-0010-7000-8000-000000000001',
  'clinic-navy-gold',
  'البطاقة الكحلية الذهبية',
  'Clinic Navy & Gold',
  1,
  'active',
  '{"background":"#071526","surface":"#0b1d33","accent":"#c9a45f","text":"#f7f3ea","muted":"#c6b994","showSeal":true,"showMemberSince":true,"showBenefits":true,"frontTaglineAr":"من التشخيص... إلى التنفيذ... إلى الأثر","frontTaglineEn":"From diagnosis to execution to impact"}'::jsonb
)
ON CONFLICT ("slug", "version") DO NOTHING;
