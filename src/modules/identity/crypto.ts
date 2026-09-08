import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateOtpCode(length = 6): string {
  const max = 10 ** length;
  const value = randomBytes(4).readUInt32BE(0) % max;
  return value.toString().padStart(length, "0");
}

export function hashSecret(value: string, pepper = process.env.AUTH_SECRET ?? "dev-only-insecure"): string {
  return createHmac("sha256", pepper).update(value).digest("hex");
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function hashForTelemetry(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
