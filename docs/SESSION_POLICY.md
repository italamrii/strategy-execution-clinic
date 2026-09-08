# Session policy

## Cookie

- Name: `clinic_session`
- Value: high-entropy opaque token (never a JWT of privileges)
- Flags: `HttpOnly`, `SameSite=Lax`, `Secure` in production
- Server stores only `sha256(token)` in `sessions.token_hash`

## Lifetime

- Absolute TTL: 14 days from session creation (`SESSION_TTL_MS`)
- Idle window: 7 days without authenticated activity (`SESSION_IDLE_MS`)
- On each authenticated request, `last_active_at` is refreshed when the session is still valid

## Rotation

- A new session row is created after successful OTP verification
- Prior devices remain until explicit logout / logout-all / admin revoke

## Revocation

- Logout revokes the current session
- Logout-all revokes every active session for the user
- Suspended/disabled accounts fail `requireAuthenticatedUser` / permission checks even if a cookie remains
