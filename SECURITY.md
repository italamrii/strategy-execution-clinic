# Security — Strategy & Execution Clinic

**عيادة الاستراتيجية والتنفيذ**

This is the engineering security policy. Threat analysis is in `THREAT_MODEL.md`. Role checks are in `RBAC_MATRIX.md`.

**Rule:** no placeholder security. If a control is not implemented, the feature that needs it is not done.

---

## 1. Security objectives

1. Protect member and volunteer personal data (PDPL-aligned).
2. Protect the integrity of memberships, hours, badges, and credentials.
3. Prevent privilege escalation and IDOR/BOLA.
4. Keep public verification trustworthy.
5. Prevent abuse: stuffing, enumeration, spam, fake hours.
6. Make sensitive actions auditable without logging secrets.

---

## 2. Authentication (Phase 1 contract)

Phase 0 does not ship login. The following is binding for Phase 1.

| Control | Requirement |
| --- | --- |
| Primary auth | Email magic link and/or OTP |
| Optional | Google OAuth (official APIs only) |
| Passwords | Not required in V1. If added: Argon2id, pepper in secret manager, breach checks later |
| Session | Server-side session record + HttpOnly cookie |
| Cookie | `Secure`, `HttpOnly`, `SameSite=Lax` (or `Strict` for admin) |
| CSRF | SameSite + origin check on mutations; double-submit if cookie is Lax and cross-site posts exist |
| Session rotation | On login and on privilege step-up |
| Logout | Server revoke + cookie clear |
| OTP/magic | hashed at rest, short TTL, single use, rate limited |
| Admin | MFA-ready schema; step-up for revoke/role change |
| Lockout | Progressive backoff, not a user-enumeration oracle |

Never store plaintext passwords, OTP codes, or magic-link tokens.

Do not hardcode admin identities.

---

## 3. Authorization

- Enforced in **module services**, not only UI.
- Checks use **permissions**.
- Object-level: the actor must be allowed on *this* application, hour entry, opportunity, or organization scope.
- Never trust client-supplied: `userId`, `role`, `membershipTypeId` as a grant, hours, credential status, badge awards, payment status.
- IDOR test: every `getById` for a non-public resource verifies ownership or permission.

Public resources (verification, opted-in profiles) still use an explicit public DTO mapper.

---

## 4. Input validation

- Zod at every HTTP/Server Action boundary.
- Parse, do not sanitize-into-success.
- Reject unknown fields (no mass assignment).
- UUID and public-code formats validated.
- Pagination limits enforced.
- HTML from users is never interpreted in card/PDF pipelines (plain text only).

---

## 5. Injection and XSS

- Parameterized queries only (Drizzle).
- React default escaping. No `dangerouslySetInnerHTML` for user content.
- CSP in production: default-src self; strict img/font; 3D/wasm exceptions documented.
- Markdown, if ever added, rendered with a sanitizer and a tight tag allowlist.

---

## 6. CSRF, CORS, cookies

- Mutations: Server Actions with Next origin checks + SameSite cookies.
- No `Access-Control-Allow-Origin: *` for authenticated APIs.
- Public verification is GET, cache-control no-store, no cookies required.

---

## 7. SSRF, uploads, PDF/image pipeline

- Server fetches only allowlisted hosts (own storage, never applicant-supplied URLs).
- Uploads: MIME allowlist, magic bytes, size cap, random keys, private bucket.
- Block SVG and HTML uploads.
- Image/PDF workers run with disabled network except storage.
- Strip risky metadata where it does not destroy the evidence (policy-documented).
- Malware scan hook is a required pipeline step; Phase 0 implementation may be a structured no-op that still must be invoked.

---

## 8. Credential security

- Public codes are not sequential.
- Verification rate-limited per IP and per code.
- Revoke/suspend updates status in the same transaction as history insert; verification reads committed state.
- Do not leak existence of emails via verify or apply endpoints beyond generic messages.

---

## 9. Rate limiting and anti-abuse

Rate-limit:

- login, OTP, magic link
- applications
- verification
- public profile/search
- card/share image generation

Protections: bot friction on apply (Phase 1: basic; later: proof-of-work or managed bot service). Duplicate open applications blocked. Volunteer hour fraud: reviewer required, evidence optional but encouraged, anomaly flags for later.

---

## 10. Session and replay

- Magic links and OTP are one-time.
- Session IDs are high-entropy.
- Session fixation: new session id at authentication.
- Sensitive admin actions may require recent authentication timestamp.

---

## 11. Secrets

- Never commit secrets. `.env.example` contains names only.
- Signing keys for future VCs/HMAC stored in env/secret manager.
- Rotate by `credential.token_version` and session invalidation.

---

## 12. Privacy (PDPL-aligned)

- Data minimization: do not collect national ID, health, or financial data in V1 without a documented legal basis.
- Purpose limitation: application data is for membership/volunteer operations.
- Separate public / private / admin data in schema and DTOs.
- Export and deletion/anonymization workflows are designed in schema (`profiles.deleted_at`, user anonymization job). Implementation is Phase 7 hardening if not required earlier by legal.
- Consent records for communications and public directory.

---

## 13. Audit and security events

Audit: role changes, application decisions, membership create/revoke, hour approve/adjust, badge issue/revoke, credential revoke, profile moderation, security settings.

Never log: passwords, tokens, OTP, magic links, full dumps of sensitive PII.

Security events: login success/failure, rate-limit trips, permission denials on admin routes, session revocations.

---

## 14. Headers and caching

Production headers: `Content-Security-Policy`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` (camera/mic default none), `X-Frame-Options: DENY` or CSP frame-ancestors none.

Verification and private pages: `Cache-Control: no-store`.

---

## 15. Dependency and CI security

- lockfile committed
- `pnpm audit` in CI (fail on critical when policy says so)
- Dependabot or equivalent later
- no auto-prod from unreviewed branches

---

## 16. Reporting

See also GitHub `SECURITY.md` reporting section in this same file for contributors:

**Reporting a vulnerability:** email the maintainers privately. Do not open public issues for active exploits. We will acknowledge and remediate according to severity.

---

## 17. Phase 0 security scope

Shipped in Phase 0:

- threat model, this policy, RBAC matrix
- security headers on the app
- public DTO types (no implementation of issue/revoke yet)
- health endpoints without sensitive dump
- `.gitignore` for env files

Not shipped: authn, MFA, malware scanner vendor, WAF. Those are scheduled; they are not claimed complete.
