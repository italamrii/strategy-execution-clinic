export const ACCOUNT_STATUSES = ["active", "suspended", "disabled"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const SESSION_COOKIE_NAME = "clinic_session";

/** Absolute session lifetime from creation / renewal. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

/**
 * Idle expiration: sessions without activity beyond this window are rejected.
 * Documented strategy: sliding activity window checked on each authenticated request.
 */
export const SESSION_IDLE_MS = 1000 * 60 * 60 * 24 * 7;

export const OTP_TTL_MS = 1000 * 60 * 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 1000 * 60;
export const OTP_EMAIL_LIMIT_PER_HOUR = 5;
export const OTP_IP_LIMIT_PER_HOUR = 20;
