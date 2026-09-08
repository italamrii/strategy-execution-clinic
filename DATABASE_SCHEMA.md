# Database Schema — Strategy & Execution Clinic

PostgreSQL. Migrations via Drizzle Kit only. Primary keys are UUIDv7 unless noted. Timestamps are `timestamptz`. Arabic/English columns are explicit.

This document is the logical schema. The Drizzle file `src/shared/db/schema/*.ts` must match.

---

## Conventions

- `id uuid primary key`
- `created_at`, `updated_at` on mutable tables
- No sequential public identifiers
- Foreign keys with explicit `on delete` (restrict by default)
- Soft delete only on `profiles` and selected content; never on hours, audit, or credential history
- Check constraints for status enums
- Indexes listed per table

---

## identity

### users

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| email | citext unique not null | |
| email_verified_at | timestamptz | |
| locale | text not null default `ar` | `ar` \| `en` |
| disabled_at | timestamptz | |
| last_login_at | timestamptz | |
| created_at / updated_at | timestamptz | |

### auth_otp_challenges

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid null | may be unknown pre-user |
| email | citext not null | |
| purpose | text | `login` \| `step_up` |
| code_hash | text not null | never plaintext |
| expires_at | timestamptz | |
| consumed_at | timestamptz | |
| created_at | timestamptz | |
| request_meta | jsonb | ip hash, ua hash — not raw PII dump |

### auth_magic_links

Same hashing/TTL/single-use pattern as OTP.

### sessions

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid not null | |
| expires_at | timestamptz | |
| revoked_at | timestamptz | |
| rotated_from | uuid | |
| ip_hash | text | |
| user_agent_hash | text | |
| created_at | timestamptz | |

### webauthn_credentials (MFA-ready, unused in Phase 0)

id, user_id, credential_id unique, public_key, counter, transports, created_at.

### profiles

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid unique not null | |
| display_name_ar | text not null | |
| display_name_en | text | |
| headline_ar / headline_en | text | |
| bio_ar / bio_en | text | |
| photo_media_id | uuid | |
| city | text | |
| country | text default `SA` | |
| visibility | text | `private` \| `members` \| `public` |
| hours_public | boolean default false | |
| directory_opt_in | boolean default false | |
| deleted_at | timestamptz | anonymization workflow |
| created_at / updated_at | | |

Private contact:

### profile_contacts (member-private)

user_id, phone_e164, phone_verified_at — never selected in public DTO.

---

## rbac

### roles

id, slug unique (`super_admin`, …), name_ar, name_en, is_system boolean, created_at.

### permissions

id, slug unique (`membership.application.review`, …), description.

### role_permissions

role_id, permission_id, unique(role_id, permission_id).

### user_roles

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid | |
| role_id | uuid | |
| organization_id | uuid null | future tenancy |
| granted_by | uuid | |
| created_at | timestamptz | |
| unique | (user_id, role_id, organization_id) | |

---

## membership

See also `docs/membership/MEMBERSHIP_LIFECYCLE.md`.

### membership_types

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| slug | text unique | |
| code | text unique | `VOL`, `FND`, … |
| name_ar / name_en | text not null | |
| description_ar / description_en | text | |
| is_enabled | boolean | safe deactivation; do not delete historical types |
| applications_open | boolean | |
| invitation_only | boolean | blocks public self-apply |
| visibility | text | `public` \| `members` \| `private` |
| validity_mode | text | `lifetime` \| `fixed_days` |
| validity_days | int null | |
| renewal_required | boolean | |
| card_design | jsonb | reserved for Phase 3 visuals |
| application_schema / workflow / entitlements / expiration_policy | jsonb | |
| sort_order | int | |
| created_at / updated_at | | |

### tracks

id, code unique, slug unique, name_ar, name_en, description_ar, description_en, is_enabled, sort_order, card_accent jsonb.

### membership_applications

id, user_id, membership_type_id, status (`draft`…`withdrawn`), headline, summary, motivation, experience, linkedin_url, portfolio_url, github_url, additional_notes, payload jsonb, reviewer_id, decision_reason, internal_notes (admin-only), submitted_at, decided_at, timestamps.

Indexes: (user_id, status), (status, submitted_at), (membership_type_id, status).

### membership_application_tracks

application_id, track_id, source (`applicant` \| `reviewer`), unique(application_id, track_id).

### membership_application_reviews

application_id, actor_user_id, action, from_status, to_status, reason, internal_notes, created_at.

### memberships

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid | |
| membership_type_id | uuid | |
| application_id | uuid null | |
| status | text | `active` \| `expired` \| `revoked` \| `suspended` |
| is_primary | boolean | |
| issued_at | timestamptz | |
| starts_at / ends_at | timestamptz | ends_at nullable |
| issued_by | uuid | |
| issue_reason | text | required for direct issuance |
| created_at / updated_at | | |

Partial unique: one active membership per (user_id, membership_type_id).

### member_tracks

membership_id, track_id, is_primary, unique(membership_id, track_id). Multiple tracks per membership allowed.

### membership_status_history

membership_id, from_status, to_status, actor_id, reason, created_at. Append-only.

## credentials

### credentials

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| membership_id | uuid unique | |
| public_code | text unique not null | |
| status | text | `active` \| `expired` \| `revoked` \| `suspended` |
| token_version | int not null default 1 | |
| issued_at | timestamptz | |
| expires_at | timestamptz | |
| revoked_at | timestamptz | |
| revoke_reason | text | |
| created_at / updated_at | | |

Index: public_code. Status check constraint.

### credential_status_history

id, credential_id, from_status, to_status, actor_id, reason, created_at. Append-only.

### credential_assets

id, credential_id, kind (`mobile_card`, `print_card`, `linkedin_portrait`, `linkedin_landscape`, `social_square`, `certificate_pdf`), media_id, locale, created_at.

---

## volunteering

### volunteer_profiles

id, user_id unique, status, joined_at, approved_hours_cache numeric, pending_hours_cache numeric, impact_score_cache int, created_at, updated_at.

Caches are rebuildable.

### volunteer_opportunities

id, title_ar, title_en, description_ar, description_en, track_id, required_skills jsonb, starts_at, ends_at, location_type (`onsite`\|`remote`\|`hybrid`), location_text_ar/en, max_participants, expected_hours, organizer_user_id, application_deadline, status, visibility, created_at, updated_at.

### volunteer_opportunity_applications

id, opportunity_id, user_id, status (`applied`\|`withdrawn`\|`accepted`\|`rejected`), created_at, decided_at, reviewer_id. Unique (opportunity_id, user_id).

### volunteer_sessions

id, opportunity_id, starts_at, ends_at, created_by, created_at.

### volunteer_hour_entries

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid | |
| opportunity_id | uuid null | |
| session_id | uuid null | |
| hours | numeric(6,2) > 0 | |
| status | text | `pending` \| `approved` \| `rejected` |
| source | text | `self_submit` \| `organizer` |
| evidence_media_id | uuid | |
| reviewer_id | uuid | |
| reviewed_at | timestamptz | |
| review_notes | text | |
| created_at | timestamptz | |

Unique partial: prevent double-submit of identical session+user while pending/approved as configured.

### volunteer_hour_adjustments

id, user_id, hour_entry_id null, delta_hours numeric, reason, actor_id, created_at. Append-only.

### volunteer_progression_rules

id, slug, name_ar/en, predicate jsonb (hours, contributions, badges, manual), target_membership_type_id null, is_enabled.

---

## community / impact / badges / recognition

### contribution_types

id, slug unique, name_ar/en, description_ar/en, is_active, requires_review, impact_weight, sort_order.

### contributions

id, user_id, contribution_type_id, kind, title_ar/en, description_ar/en, occurred_at, source, related_opportunity_id, evidence_media_id, visibility, status (`draft`|`submitted`|`under_review`|`approved`|`rejected`|`revoked`), submitted_by, reviewer_id, reviewed_at, review_notes.

### badge_definitions

id, slug unique, names/criteria ar/en, issuance_mode (`automatic`|`manual`|`hybrid`), expiration_mode, design_version `BADGE_DESIGN_V1`.

### badge_awards

id, badge_definition_id, user_id, public_code unique (`SEC-BDG-…`), status, issued_at, expires_at, revoked_at, source_type/id, reason. Partial unique active award per user+definition.

### certificate_definitions / certificates

Certificates require source_type + source_id. public_code unique (`SEC-CRT-…`). Unique (definition_id, source_type, source_id). template_version `CERTIFICATE_DESIGN_V1`.

### member_milestones

user_id + kind + threshold unique. Historical rows remain if totals later drop.

### public_profile_settings

Visibility flags + optional public_handle (reserved words blocked).

### impact_rules / impact_events

Weights configurable. Events revoked rather than deleted. Score is derived; clients cannot submit totals.

### impact_rules

id, event_kind, weight numeric, is_enabled, created_at, updated_at.

### impact_events

id, user_id, kind, source_table, source_id, value numeric, revoked_at, created_at. Append-only.

---

## organizations / partners (stub)

### organizations

id, name_ar, name_en, type (`institution`\|`partner`\|`other`), status, created_at.

### organization_members (future)

id, organization_id, user_id, org_role, created_at.

### partners

id, organization_id, visibility, created_at.

---

## content / media / notifications / platform / audit

### media_objects

id, bucket, object_key, mime, byte_size, checksum, visibility (`private`\|`public`), created_by, created_at.

### notifications

id, user_id, locale, channel, template, payload jsonb, sent_at, created_at.

### feature_flags

id, key unique, enabled, payload jsonb, updated_at.

### system_settings

id, key unique, value jsonb, updated_at.

### audit_logs

id, actor_user_id null, action, resource_type, resource_id, request_id, reason, before jsonb, after jsonb, ip_hash, created_at.

Indexes: (resource_type, resource_id), (actor_user_id, created_at), created_at.

No updates. No deletes in application code.

### security_events

id, kind, user_id null, request_id, meta jsonb (no secrets), created_at.

### consent_records

id, user_id, purpose, granted, created_at.

---

## Seed data (Phase 0/2)

Membership types and tracks from `PRODUCT_REQUIREMENTS.md` are inserted by `src/shared/db/seed/catalog.ts`. Slugs/codes are data.

---

## Indexing highlights

- `credentials(public_code)`
- `memberships(user_id, status)`
- `volunteer_hour_entries(user_id, status)`
- `audit_logs(created_at desc)`
- `users(email)`

---

## Recalculation

Approved hours:

```
sum(entries.hours where status=approved) + sum(adjustments.delta_hours)
```

Impact score:

```
sum(events.value * rules.weight) where events.revoked_at is null and rules.enabled
```
