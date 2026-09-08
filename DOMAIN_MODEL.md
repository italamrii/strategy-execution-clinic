# Domain Model — Strategy & Execution Clinic

**عيادة الاستراتيجية والتنفيذ**

This is the ubiquitous language for the modular monolith. Schema details live in `DATABASE_SCHEMA.md`. Product rules live in `PRODUCT_REQUIREMENTS.md`.

---

## 1. Bounded contexts

| Context | Owns | Does not own |
| --- | --- | --- |
| Identity | Person account, session, auth factors, locale preference | Membership status, hours |
| Membership | Types, applications, memberships, tracks | Card pixels, hour math |
| Credentials | Public codes, verification DTO, status history, render jobs | Who is allowed to join |
| Volunteering | Opportunities, applications, sessions, hours, adjustments | Badge catalog |
| Recognition | Contributions, badge awards, certificates, public profile projection | Authoritative hours, RBAC |
| Admin | Composition of other contexts for staff | Own source of truth for members |
| Audit | Append-only records of sensitive actions | Business decisions |
| Platform | Flags, settings, health | Domain invariants |
| Organizations (future) | Org legal entity, org members | Person identity |
| Events (future) | Occurrences, registration, attendance | Credential issuance |
| Assessments (future) | Definitions, runs, scores | Membership |
| Clinic AI (future) | Tool calls under authz | Direct table access |
| Commercial (future) | Entitlements, SKUs | Security roles |

---

## 2. Core entities

### Person (`users` + `profiles`)

A natural person who can authenticate. Not an organization.

- A person may have zero or more memberships over time.
- A person has one profile record.
- Profile splits **public**, **member-private**, and **admin-only** fields.

### MembershipType

Configurable category (Founding Member, Volunteer Member, …). Seeded, not hardcoded as the only way to exist.

Holds: bilingual labels, code prefix, card design metadata, application form schema reference, workflow, visibility, expiration policy, **entitlements** (product), never admin roles.

### Track

Configurable professional path. Members associate via `member_tracks`.

### MembershipApplication

A request to obtain a membership type. Status is server-owned. Applicant cannot approve it.

### Membership

Authoritative grant that a person holds a type, with period, primary flag, and lifecycle.

Phase 2 creates the membership record only. Public credentials, cards, and QR
verification begin in Phase 3.

### Credential

Server-verified professional credential bound to a membership.

- Internal id: UUIDv7
- Public code: `SEC-{TYPECODE}-{YEAR}-{RANDOM}`
- Status: `ACTIVE` | `EXPIRED` | `REVOKED` | `SUSPENDED`
- Status changes append `credential_status_history`

### VolunteerProfile

Volunteer-specific projection on a person. Exists when volunteering is relevant. Hours totals are **derived** plus a cached materialized view that can be rebuilt.

### VolunteerOpportunity

A published unit of work. Lifecycle is explicit. Capacity is enforced server-side.

### VolunteerOpportunityApplication

Person applies to an opportunity. Distinct from membership application.

### VolunteerSession

A scheduled or recorded instance of work (attendance source).

### VolunteerHourEntry

An append-only claim of hours. Starts `PENDING`. Reviewer sets `APPROVED` or `REJECTED`. Never overwritten.

### VolunteerHourAdjustment

A signed delta (positive or negative) against the volunteer’s approved record, with reason, actor, and pointer to the original entry. Used for corrections.

### Contribution

An approved professional contribution (initiative work, knowledge, leadership activity). May generate impact events.

### BadgeDefinition / BadgeAward

Definition is catalog. Award is an issued, revocable credential-like object. Prepared for Open Badges 3.0 mapping.

### ImpactEvent

Ledger row. Score is a function of events + rules.

### Organization / Partner (V1 stub)

Legal entity records may exist for institutional/partner applications. Full tenancy is Phase 8.

### Role / Permission / UserRole

Identity-adjacent, queried by every module. Permissions are strings such as `volunteer.hours.review`.

### AuditLog

Immutable-style event. Actor, action, resource, before/after summaries, correlation id. No secrets.

### MediaObject

Pointer to object storage. Never a user-controlled URL fetched server-side without allowlist.

### FeatureFlag / SystemSetting

Platform configuration.

---

## 3. Aggregates and invariants

### Membership issuance

Invariant: only a permissioned actor can create a `Membership` from an `approved` application (or an explicit admin grant that itself is audited).

Invariant: applicant cannot be the sole approver of their own application.

### Credential

Invariant: public verification of a `REVOKED` or `SUSPENDED` credential never returns `ACTIVE`.

Invariant: public DTO contains only allowlisted fields.

### Hours

Invariant: volunteer cannot approve own hour entries.

Invariant: approved hours = sum(approved entries) + sum(adjustments). Cache must match.

Invariant: two concurrent approvals of the same entry yield one decision (row lock / unique review).

### Progression

Invariant: thresholds live in configuration. Code evaluates rules; it does not hardcode “40 hours = leader”.

### Entitlement vs permission

Invariant: `MembershipType.entitlements` never includes `admin.*` permissions.

---

## 4. Public vs private projections

| Projection | Contains | Audience |
| --- | --- | --- |
| Verification DTO | Name, type, tracks (public), status, member since, optional hours/badges/photo | Anyone with the code |
| Public profile | Opt-in profile fields, approved timeline | Public if enabled |
| Member home | Private hours pending, applications, notifications | The member |
| Admin member view | Notes, reviewer comments, security flags | Permissioned staff |
| Auditor view | Audit logs, no OTP/secrets | `audit.read` |

---

## 5. Domain events (in-process)

Examples:

- `MembershipApplicationSubmitted`
- `MembershipApproved`
- `CredentialStatusChanged`
- `VolunteerHoursApproved`
- `VolunteerHoursAdjusted`
- `BadgeAwarded`
- `BadgeRevoked`
- `ImpactEventRecorded`

Subscribers: notifications, impact ledger, card render jobs, analytics.

Events are not a microservice bus in V1. They are a module port (in-process dispatcher).

---

## 6. Identifiers

| Kind | Format | Guessability |
| --- | --- | --- |
| Primary keys | UUIDv7 | not used as access tokens |
| Public membership code | `SEC-VOL-2026-K7M4` style, random suffix | rate-limited lookup |
| Verification QR | URL to localized verify route | same as code |
| Future signed token | HMAC of credential id + version | required for offline/print expansion |

Sequential integers are not used as public identifiers.

---

## 7. Lifecycle sketch

```
Visitor → User (identity)
       → MembershipApplication
       → Membership + Credential
       → MemberTracks
       → VolunteerProfile
       → OpportunityApplication
       → HourEntry PENDING → APPROVED
       → ImpactEvent + optional BadgeAward
       → Public profile / share card
```

---

## 8. Language of status

Use these terms in code and UI translations (do not invent synonyms):

- Application: `draft`, `submitted`, `under_review`, `approved`, `rejected`, `withdrawn`, `waitlisted`
- Opportunity: `draft`, `published`, `applications_open`, `closed`, `in_progress`, `completed`, `archived`
- Hour entry: `pending`, `approved`, `rejected`
- Credential: `active`, `expired`, `revoked`, `suspended`
- Volunteer profile: `active`, `inactive`, `suspended`
