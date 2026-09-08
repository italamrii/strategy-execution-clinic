# Security Review — Phase 7

**Date:** 2026-08-31  
**Scope:** Production hardening (no new product features)

## Summary

Code-level controls implemented for environment validation, test-route blocking, production email/storage guards, security headers, and structured logging. **Launch-blocking infrastructure items (managed DB, HTTPS domain, real SMTP inbox, managed restore) require operator provisioning — not verified in this session.**

## Findings

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| P7-01 | HIGH | No managed PostgreSQL provisioned / verified | **OPEN** — external |
| P7-02 | HIGH | Real SMTP mailbox delivery not verified | **OPEN** — external |
| P7-03 | HIGH | Production HTTPS domain not configured | **OPEN** — external |
| P7-04 | HIGH | Managed DB restore test not executed | **OPEN** — local drill only |
| P7-05 | MEDIUM | SPF/DKIM/DMARC not verified (no domain) | **OPEN** — external |
| P7-06 | MEDIUM | Error tracking DSN not configured in prod | **MITIGATED** — abstraction ready |
| P7-07 | LOW | CSP allows `unsafe-inline` scripts (Next.js) | **ACCEPTED** — documented |
| P7-08 | INFO | Rate limits use PostgreSQL buckets (multi-instance safe) | **PASS** |
| P7-09 | INFO | Test routes return 404 unless E2E=true | **PASS** (unit + e2e) |
| P7-10 | INFO | Design preview disabled when APP_ENV=production | **PASS** |
| P7-11 | INFO | Session cookies Secure in production | **PASS** |
| P7-12 | INFO | Authorization tests Phases 1–6 remain green | **PASS** |

## Access control review (code)

- Server-side RBAC unchanged; UI hiding not security
- Notification IDOR covered in integration tests
- Volunteer scope / self-approval blocked in domain services
- Public DTOs allowlisted in prior phases

## Abuse controls

- OTP rate limits (email + IP) via `rate_limit_buckets`
- Verification / directory rate limits on public routes
- Export routes require authorization

## Recommendations before launch

1. Provision staging → production with separate secrets
2. Verify 5 real email templates in real inboxes (AR + EN)
3. Complete managed restore test and record evidence
4. Configure `OPS_READINESS_TOKEN` and monitoring alerts
5. Rotate any secret ever committed to git history
