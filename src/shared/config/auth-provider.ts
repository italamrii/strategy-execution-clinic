import { resolveAppEnvironment } from "@/shared/config/runtime";

export type AuthProvider = "clerk" | "legacy";

export function resolveAuthProvider(
  source: Record<string, string | undefined> = process.env,
): AuthProvider {
  const value = source.AUTH_PROVIDER?.trim().toLowerCase();
  if (value === "clerk") return "clerk";
  if (value === "legacy") return "legacy";
  // Prefer Clerk when keys are present and provider unset (local convenience).
  if (
    source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    source.CLERK_SECRET_KEY &&
    resolveAppEnvironment(source) !== "e2e"
  ) {
    return "clerk";
  }
  return "legacy";
}

export function isClerkAuthProvider(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return resolveAuthProvider(source) === "clerk";
}

export function getClerkPublishableKey(
  source: Record<string, string | undefined> = process.env,
): string | undefined {
  return source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || undefined;
}

export function hasClerkSecretKey(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(source.CLERK_SECRET_KEY?.trim());
}
