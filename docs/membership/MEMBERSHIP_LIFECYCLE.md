# Membership Lifecycle — Phase 2

Authoritative membership is issued only after a successful application review
or controlled direct issuance. Credentials, cards, and QR verification are
**out of scope** until Phase 3.

## Application states

| Status | Meaning |
| --- | --- |
| `draft` | Applicant can edit |
| `submitted` | Awaiting review queue |
| `under_review` | Reviewer actively working |
| `changes_requested` | Applicant may edit and resubmit |
| `approved` | Terminal; membership issued |
| `rejected` | Terminal |
| `withdrawn` | Terminal (applicant) |

### Allowed transitions

- `draft` → `submitted`
- `submitted` → `under_review` | `withdrawn`
- `under_review` → `changes_requested` | `approved` | `rejected`
- `changes_requested` → `submitted` | `withdrawn`

Invalid transitions fail server-side. Clients cannot set status directly.

## Membership statuses

| Status | Meaning |
| --- | --- |
| `active` | Authoritative current membership |
| `suspended` | Temporarily inactive; history retained |
| `expired` | Past validity (future automation) |
| `revoked` | Permanently inactive; history retained |

Every status change writes `membership_status_history`.

## Duplicate policy

A user **cannot** hold two simultaneous `active` memberships of the **same**
membership type. Enforced with a partial unique index:

`(user_id, membership_type_id) WHERE status = 'active'`

Different types (e.g. Founding + Volunteer) may coexist.

## Founding / invitation-only

`founding_member`, `strategic_partner`, and `institutional_member` seed as
`invitation_only = true` with `applications_open = false` for public self-apply.

Public apply lists only types that are enabled, applications open, and not
invitation-only. Server re-checks eligibility; client type id is never trusted.

Direct issuance requires `membership.issue` and a mandatory reason, audited as
`MEMBERSHIP_ISSUED_DIRECTLY`.

## Approval atomicity

Approval runs in one PostgreSQL transaction:

1. Lock application row (`FOR UPDATE`)
2. Validate `under_review` and non-self reviewer
3. Insert membership + tracks + status history
4. Mark application `approved` + review event
5. Write audit events

Concurrent double-approve yields exactly one membership.

## Self-approval

Reviewers/admins **must not** approve their own application. Enforced in
authorization helpers and again inside the issuance transaction.
