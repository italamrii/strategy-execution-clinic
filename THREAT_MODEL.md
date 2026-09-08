# Threat Model — Strategy & Execution Clinic

**عيادة الاستراتيجية والتنفيذ**

| Field | Value |
| --- | --- |
| Status | Phase 0 — living document |
| Method | STRIDE + abuse cases for credentials and volunteering |
| Review | Before Phase 1 auth and before Phase 3 public verification go live |

This is not a compliance certificate. It is the working threat model the team builds against.

---

## 1. Assets

| Asset | Sensitivity | Integrity need |
| --- | --- | --- |
| Member PII (email, phone, notes) | High | High |
| Membership and credential status | High (trust) | Critical |
| Volunteer hours ledger | High (professional record) | Critical |
| Badge awards | Medium-high | High |
| Admin sessions | Critical | Critical |
| Signing keys / session secrets | Critical | Critical |
| Public verification truth | Public confidentiality, critical integrity | Critical |
| Uploaded evidence | Medium-high | High |
| Audit logs | High | Critical (append-only) |

---

## 2. Actors

| Actor | Intent |
| --- | --- |
| Anonymous visitor | Learn, verify, apply |
| Authenticated applicant/member | Use the product honestly |
| Volunteer | Record impact honestly |
| Reviewer / volunteer leader | Review hours and applications |
| Platform admin | Operate the Clinic |
| Malicious outsider | Enumerate, scrape, stuff credentials, XSS |
| Malicious insider / compromised staff | Issue fake memberships, fake hours |
| Compromised volunteer | Inflate hours, self-approve |
| Botnet | OTP/apply/verify flooding |

---

## 3. Trust boundaries

1. Browser ↔ Next.js (untrusted input, trusted HTML if we escape)
2. Next.js ↔ PostgreSQL (trusted network in VPC; still parameterized)
3. Next.js ↔ object storage
4. Next.js ↔ email provider
5. Public verification page ↔ world (no session)
6. Future: Clinic AI tools ↔ domain services (AI is untrusted for authority)

---

## 4. STRIDE

### 4.1 Spoofing

| Threat | Mitigation |
| --- | --- |
| Steal session cookie | HttpOnly, Secure, rotation, short idle for admin |
| Replay magic link | one-time hash, TTL |
| Fake Google login | official OAuth, state/nonce |
| Fake membership card image | verification URL is source of truth; OG images are not credentials |
| Staff impersonation | unique admin accounts, no shared passwords, audit |

### 4.2 Tampering

| Threat | Mitigation |
| --- | --- |
| Client sets `status=approved` | ignored; server state machine |
| Hour overwrite | append-only + adjustments |
| Mass assignment of role | Zod strip; permission service |
| Card HTML injection | plain-text templates |
| SQL injection | Drizzle bound parameters |

### 4.3 Repudiation

| Threat | Mitigation |
| --- | --- |
| Admin denies a revoke | audit log with actor, before/after, reason |
| Reviewer denies an approval | hour decision records |

### 4.4 Information disclosure

| Threat | Mitigation |
| --- | --- |
| Verify page leaks email | public DTO allowlist + tests |
| IDOR on applications | object-level authz tests |
| Sequential code scrape | random codes + rate limit |
| Cache shows revoked as active | `no-store` |
| Logs contain OTP | denylist fields in logger |
| Directory lists private members | flags + profile visibility |

### 4.5 Denial of service

| Threat | Mitigation |
| --- | --- |
| OTP flood | rate limit + provider caps |
| PDF generation bomb | queue, size limits, authz |
| Unbounded admin list queries | pagination |
| 3D on low-end devices | lazy + fallback, not a security issue but availability |

### 4.6 Elevation of privilege

| Threat | Mitigation |
| --- | --- |
| Member becomes admin via API | permission checks; no client roles |
| Volunteer leader reviews own hours | invariant + tests |
| Paid membership treated as admin | entitlements ≠ roles |
| Feature flag bypass | server module guard |

---

## 5. Critical abuse cases (must have tests)

1. Member cannot approve own application.
2. Volunteer cannot approve own hours.
3. Non-admin cannot issue memberships.
4. Revoked credential fails verification (`ACTIVE` never returned).
5. Private profile fields absent from public JSON/HTML.
6. Role escalation via request body is ignored.
7. Duplicate approval does not duplicate hours.
8. Concurrent approval is safe (one winner).
9. Adjustments preserve history.
10. QR/code resolves the correct credential.
11. Expired/suspended membership displays correct state and blocks privileges.
12. Enumeration of `SEC-VOL-2026-0001..9999` does not harvest the directory (codes are not that sequence; rate limits apply).

---

## 6. Public verification threat focus

Attacker goal: mint fake prestige or scrape members.

Controls:

- unguessable public suffix
- rate limits
- no search-by-email on verify
- status from DB, not from QR payload claims (QR is an identifier, not a signed “ACTIVE” assertion in V1; signed tokens are a Phase 3+ option)
- if signed tokens are added, verify signature **and** current DB status (revoke must win)

---

## 7. Volunteer fraud

Attacker goal: fake professional record.

Controls:

- no self-approval
- reviewer permission
- evidence stored privately
- adjustments not deletes
- later: anomaly scores (hours/day caps as configurable policy)

---

## 8. AI (future)

Clinic AI is an untrusted assistant.

Cannot: approve memberships, approve hours, change permissions, issue paid credentials, or write authoritative records except through the same authorized services a human would call — and only when the workflow explicitly allows a draft that a human confirms.

No direct database credentials for models.

---

## 10. Phase 2 membership threats (active)

| Threat | Control |
| --- | --- |
| IDOR on applications | Ownership checks + security event |
| Self-approval | Authorization helper + issuance transaction guard |
| Invitation-only bypass | Server eligibility on type flags |
| Mass assignment of status/tracks | Zod at actions; status only via state machine |
| Internal note leakage | Member/public DTOs omit `internalNotes` |
| Duplicate / concurrent approval | `FOR UPDATE` + partial unique active index |
| Unauthorized direct issuance | `membership.issue` + mandatory reason + audit |

| Risk | Status |
| --- | --- |
| No authn implemented yet | Accepted: no sensitive data in Phase 0 runtime |
| Malware scanner vendor not contracted | Hook exists; do not enable arbitrary uploads until wired |
| Staff insider fraud | Mitigated by audit + dual control later for mass issuance; residual |
| Physical card cloning | Out of scope until NFC; QR still verifies live status |

---

## 11. Phase 5 recognition threats

| Threat | Control |
| --- | --- |
| Volunteer Leader IDOR | Object-scope helpers; lists filtered by organizer |
| Self-approval of contributions | Owner check + missing approve permission on member |
| Self-awarding badges | `badge.issue` + actor ≠ recipient |
| Fake certificates | Source must be approved contribution / active badge / active membership |
| Public-code enumeration | Non-sequential Crockford codes |
| RBAC via badge | Awards never call `assignRole` |
| HTML/PDF injection | Escape in SVG/PDF; no user HTML templates |
| Private contribution leakage | Public DTO filters approved+public only |
| Directory scraping | Rate limit 90/min per client key |
| Stale revoked verification | Verification reads current status |
| Forged impact totals | Score derived from events; `impact.config.manage` for weights only |

---

## 12. Review gates

- an update to this file or an ADR
- authorization tests
- audit on mutations
