# Product Requirements — Strategy & Execution Clinic

**عيادة الاستراتيجية والتنفيذ**

| Field | Value |
| --- | --- |
| Document | PRODUCT_REQUIREMENTS.md |
| Status | Phase 5 — Recognition, impact, badges, certificates, public profile implemented |
| Product | Strategy & Execution Clinic |
| Repo | `strategy-execution-clinic` |
| Primary language | Arabic |
| Secondary language | English |
| Audience | Individuals, volunteers, experts, founding members, partners, institutions, future paid customers |

This document is the product contract. Architecture, schema, RBAC, tests, and UI must remain consistent with it. If a later document conflicts with this one, this file wins for *what* we build; `ARCHITECTURE.md` wins for *how* we build it; `SECURITY.md` and `THREAT_MODEL.md` win for *what we refuse to ship*.

---

## 1. Vision

The platform is the digital home of Strategy & Execution Clinic.

LinkedIn and social channels acquire attention. This platform is the ecosystem: membership, volunteering, verified credentials, professional identity, measurable impact, and — later — events, organizations, assessments, digital products, and Clinic AI.

The product must create prestige, trust, belonging, professional identity, measurable impact, and network effects.

A member should feel:

> هذه جهة لها وزن.

The membership card is not decoration. The volunteer profile is not decoration. The verified credential is not decoration. Every visible status must be backed by an authoritative server record.

---

## 2. Problem

Professionals in strategy, execution, performance, institutional excellence, GRC, human capital, and AI currently scatter their identity across:

- social posts with no verification
- informal volunteer hours with no audit trail
- certificates that cannot be checked
- closed institutional networks with no public credential

The Clinic needs a system that issues, verifies, and protects professional standing.

---

## 3. Primary product priority (V1)

**Membership + volunteering + verified digital cards.**

Volunteering is a first-class product, not a subset of membership.

Volunteer concept:

> تطوعك ليس ساعات فقط، بل سجل أثر مهني موثّق.

Your volunteering is not hours only. It is a verified professional impact record.

---

## 4. Who the platform serves

| Persona | Arabic | Needs |
| --- | --- | --- |
| Visitor | زائر | Understand the Clinic, apply, verify a credential |
| Applicant | متقدم | Apply for membership or volunteering |
| Member | عضو | Digital card, profile, tracks, sharing |
| Volunteer | متطوع | Opportunities, hours, impact record, badges |
| Volunteer Leader | قائد متطوعين | Opportunities, attendance, hour review (scoped) |
| Reviewer | مراجع | Approve/reject hours and selected applications |
| Track Lead | قائد مسار | Track-scoped community and review |
| Partner | شريك | Partner identity, later institutional features |
| Institutional contact | ممثل جهة | Apply as an organization, later team seats |
| Admin | مشرف | Review, issue, revoke, configure, audit |
| Auditor | مدقق | Read-only sensitive logs and reports |
| Future customer | عميل | Assessments, SaaS, paid products (not V1) |

---

## 5. Core journey

1. Visitor discovers the Clinic.
2. Applies for membership and/or volunteering.
3. Application is reviewed by authorized staff.
4. On approval, the person receives:
   - a verified digital membership
   - a professional membership card
   - a public verification page
5. The member joins one or more professional tracks (policy-controlled).
6. The member participates in initiatives, labs, and (later) events.
7. Volunteers earn **approved** hours and contributions.
8. The member receives badges/credentials.
9. The member builds a professional impact profile.
10. The member shares achievements to LinkedIn via standard sharing.
11. The member progresses through configurable membership/volunteer levels.
12. The member may become expert, leader, partner, or founding contributor.

---

## 6. Membership types

Membership types are **configurable database entities**, not hardcoded product enums.

Initial seed types (labels are data, not source-code constants that block new categories):

| Slug | Code | English | Arabic |
| --- | --- | --- | --- |
| `founding_member` | `FND` | Founding Member | عضو مؤسس |
| `expert_member` | `EXP` | Expert Member | عضو خبير |
| `professional_member` | `PRO` | Professional Member | عضو مهني |
| `contributor` | `CTR` | Contributor | مساهم |
| `volunteer_member` | `VOL` | Volunteer Member | عضو متطوع |
| `volunteer_leader` | `VLD` | Volunteer Leader | قائد متطوعين |
| `distinguished_volunteer` | `DVL` | Distinguished Volunteer | متطوع متميز |
| `strategic_partner` | `PTR` | Strategic Partner | شريك استراتيجي |
| `institutional_member` | `INS` | Institutional Member | عضو مؤسسي |

Admins must be able to, without a code change:

- add, disable, rename types
- configure Arabic/English labels
- configure card design metadata
- configure application requirements
- configure approval workflow
- configure privileges (entitlements, not security roles)
- configure visibility
- configure expiration/renewal rules

**Privilege vs role:** a membership type may grant product entitlements (directory visibility, volunteer access). It must never grant admin power. Paid or prestigious membership is never equivalent to `SUPER_ADMIN`.

A person may hold more than one membership over time. At most one **primary active membership** is displayed on the card unless policy says otherwise. Historical memberships remain in the audit/credential history.

---

## 7. Professional tracks

Tracks are configurable.

Initial seed tracks:

| Code | English | Arabic |
| --- | --- | --- |
| `01` | Strategy | مسار الاستراتيجية |
| `02` | Execution | مسار التنفيذ |
| `03` | Performance | مسار الأداء |
| `04` | Institutional Excellence | مسار التميز المؤسسي |
| `05` | Institutional Transformation | مسار التحول المؤسسي |
| `06` | Governance, Risk & Compliance | مسار الحوكمة والمخاطر والالتزام |
| `07` | Human Capital | مسار رأس المال البشري |
| `08` | AI & Automation | مسار الذكاء الاصطناعي والأتمتة |

A member may belong to one or multiple tracks according to admin-configured policy.

---

## 8. Applications

### 8.1 Membership application

A visitor or authenticated user submits an application for a membership type.

Required in V1 (exact fields are schema-owned and admin-configurable per type):

- legal / display name (Arabic and optional English)
- email
- requested membership type (server-validated, must be open for applications)
- requested track(s) if required by type
- motivation / contribution statement
- consent records required by policy
- optional organization name for institutional/partner types

Server rules:

- the client cannot self-assign type, status, or reviewer
- duplicate open applications for the same person + type are rejected
- rate-limited
- never auto-approved

Statuses: `draft` → `submitted` → `under_review` → `approved` | `rejected` | `withdrawn` | `waitlisted`

### 8.2 Volunteer application

Volunteer applications may be:

- a volunteer membership application, and/or
- an application to a specific volunteer opportunity

Both are first-class.

---

## 9. Digital membership card

Every approved member receives a premium digital membership card that represents a **server-verified credential**.

The card is a rendering of a credential. The 3D or image display is never the source of truth.

Displayed information (example):

- Clinic identity
- Member name (AR + EN)
- Membership type
- Track(s)
- Public membership code, e.g. `SEC-VOL-2026-K7M4`
- Status: ACTIVE / VERIFIED (or EXPIRED / REVOKED / SUSPENDED)
- Member since
- Approved volunteer hours (if volunteering enabled and hours exist)
- Approved contributions count (if public)
- QR code pointing at the public verification URL

Generated assets (Phase 3):

1. Mobile membership card
2. Printable card
3. LinkedIn portrait card
4. LinkedIn landscape/share card
5. Square social badge
6. Membership certificate PDF

Rendering rules:

- excellent Arabic, RTL, mixed AR/EN
- high DPI
- never trust user-supplied HTML/CSS
- protect image/PDF pipelines against injection and SSRF
- print-safe layouts so physical PVC/NFC can be added later without changing credential IDs

Card families differ by material, engraving, border, and iconography — not rainbow colors. See `DESIGN_SYSTEM.md` and `BRAND_TOKENS.md`.

---

## 10. Public verification

Example route:

- `/ar/verify/SEC-VOL-2026-K7M4`
- `/en/verify/SEC-VOL-2026-K7M4`

QR resolves the same credential.

Public page may show only explicitly public fields:

- verified membership indicator
- name (public display name)
- membership type
- track(s) the member chose to show
- member since
- credential status
- approved volunteer hours (if the member made hours public)
- selected badges
- optional profile photo

Never expose:

- email, phone
- private notes
- internal UUIDs as the only public identifier in UI copy (internal IDs may exist in HTML only if they are not sensitive; prefer public codes)
- admin comments
- security metadata, session data, reviewer identity
- pending hours, rejected hours, private applications

Revocation, expiry, or suspension must immediately change public verification. Do not serve a cached “ACTIVE” after revocation.

Statuses: `ACTIVE`, `EXPIRED`, `REVOKED`, `SUSPENDED`.

---

## 11. Credential identifiers

- Internal primary keys: UUIDv7 (or equivalent time-ordered UUID).
- Public membership codes are a separate namespace.
- Do not use sequential integers as a security boundary.
- Public codes must not be trivially enumerable. The product example `SEC-VOL-2026-0041` is a *display pattern*, not a sequential issuance algorithm. V1 uses a type prefix + year + cryptographically random suffix, uniqueness-enforced.
- QR payloads include the public code and a verification path. Signed verification tokens are supported in the credential module for future offline/print use.
- Architecture must remain compatible with Open Badges 3.0 / Verifiable Credentials. No blockchain.

---

## 12. Volunteer system

Each volunteer has:

- volunteer profile
- membership (typically volunteer-related type, but hours are not limited by marketing labels)
- track(s)
- status
- joined date
- total **approved** hours
- pending hours (private)
- initiatives / opportunities
- contributions
- achievements
- badges
- certificates
- impact score (derived)
- history / audit trail

### 12.1 Hour integrity (non-negotiable)

Volunteer hours are **never self-approved**.

Workflow:

1. Volunteer joins an opportunity (or an organizer records attendance).
2. Work is performed.
3. Volunteer submits evidence and/or organizer records a session.
4. Hours enter `PENDING`.
5. An authorized reviewer reviews.
6. `APPROVED` or `REJECTED`.
7. Only approved hours enter the permanent public/professional record.

Every decision records:

- reviewer
- timestamp
- source
- activity
- hours
- optional evidence reference
- reason/notes
- previous state
- new state

Hours cannot be overwritten. Corrections create an **adjustment** with a full audit record.

A volunteer cannot approve their own hours. A duplicate approval must not duplicate hours. Concurrent approvals must be transaction-safe.

### 12.2 Opportunities

Admins and authorized leaders create opportunities with bilingual content, track, skills, schedule, location/remote, capacity, expected hours, organizer, deadline, status, and visibility.

Lifecycle:

`draft` → `published` → `applications_open` → `closed` → `in_progress` → `completed` → `archived`

Volunteers can discover, filter, apply, withdraw, see status, receive accept/reject, attend, submit evidence, and receive hours after approval.

### 12.3 Progression

Progression is configurable. Example path (not hardcoded thresholds):

Volunteer → Active Volunteer → Distinguished Volunteer → Volunteer Leader → Community Ambassador

Admins configure conditions: approved hours, contributions, initiative participation, leadership activities, badges, and/or manual approval.

---

## 13. Member impact profile

Optional public professional page.

May show:

- display name
- membership type
- track(s)
- impact score
- approved volunteer hours
- initiatives
- contributions
- badges
- certificates
- timeline of **approved** achievements

Members control visibility at a reasonable granularity (profile public/private, hours public/private, directory inclusion).

Private records are hidden by default.

---

## 14. Impact score

Impact score is not a vanity counter.

Rules:

- transparent
- configurable weights
- auditable
- based on real approved actions
- stored as underlying events; displayed score is derivable/recalculable

Potential event sources: volunteer contribution, initiatives, labs, peer-reviewed contributions, leadership, published knowledge, approved tools/models, event participation.

AI must never write authoritative impact events without an authorized human workflow.

---

## 15. Badges and achievements

Badges are issued records, not CSS stickers.

Each badge definition: Arabic name, English name, description, issuer, criteria, optional expiration, share image, Open Badges-ready metadata fields.

Each award: issuance date, evidence, verification URL, revocation.

Seed examples (data): Contributor, Lab Leader, Strategy Expert, Performance Contributor, AI Pioneer, Distinguished Volunteer, Founding Member.

---

## 16. LinkedIn sharing

Members should be proud to share membership.

V1 provides:

- “Share Membership”
- generated social assets
- Open Graph metadata on public profile/verification URLs
- copy-ready Arabic and English post text
- the public profile/verification URL

Do **not** depend on undocumented LinkedIn APIs.

---

## 17. Admin control center

A serious admin console (desktop-optimized, tablet-usable).

Areas: dashboard, membership applications, volunteer applications, members, membership types, tracks, volunteer opportunities, volunteer hours, badges, credentials, cards, certificates, events, content, partners, organizations, audit logs, reports, system settings, feature flags, security events.

Dashboard metrics must be derived from authoritative records. Never display unverified metrics as real.

---

## 18. Localization and visual identity

- Arabic is primary. English is fully supported.
- Localized routes: `/ar/...`, `/en/...`.
- Every user-visible string uses translation resources. No hardcoded UI copy in JSX.
- Database content that may be localized stores `*_ar` and `*_en` (or an equivalent localization model).
- Light-first institutional visual identity. See `DESIGN_SYSTEM.md` and `BRAND_TOKENS.md`.
- 3D is progressive enhancement. See `3D_RENDERING_STRATEGY.md`.

---

## 19. Out of scope for V1 / Phase 0–1

Explicitly **not** in the first implementation phases:

- payments
- Clinic AI as a product
- full enterprise multi-tenant SaaS
- assessment engine runtime
- NFC physical cards
- blockchain
- undocumented social APIs
- self-service hour approval
- dark-first UI

Architecture must not make these impossible later.

---

## 20. Feature flags

Major modules are flag-gated:

`VOLUNTEERING`, `BADGES`, `PUBLIC_DIRECTORY`, `EVENTS`, `ORGANIZATIONS`, `ASSESSMENTS`, `AI`, `PAYMENTS`, `PARTNERS`

Flags control rollout. They are not a substitute for authorization.

---

## 21. Success metrics (product, not vanity)

- application → approval cycle time
- verified credentials issued
- public verification success rate
- approved volunteer hours (not pending)
- opportunity fill rate
- share actions (self-reported / OG fetch is not a substitute)
- credential revocation lag (must be immediate)
- Arabic task completion without language switching

---

## 22. Definition of done (product)

A feature is done only when:

- implemented against this document
- types, lint, and tests pass
- authorization is server-enforced
- validation exists
- errors are handled and not silent
- audit exists for sensitive mutations
- Arabic works; English works
- responsive UI works
- security reviewed
- documentation updated

“UI exists” is not done.

---

## 23. Phase 0 boundary

Phase 0 delivers requirements, architecture, domain, security, schema, RBAC, test strategy, design system, i18n/RTL, repository scaffold, CI, and a bilingual design preview.

Phase 0 does **not** implement Identity (Phase 1) beyond scaffold boundaries, health endpoints, and design preview.
