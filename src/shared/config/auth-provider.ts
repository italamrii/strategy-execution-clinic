import { isE2ERuntime, isProductionRuntime, resolveAppEnvironment } from "@/shared/config/runtime";

export type AuthProvider = "clerk" | "legacy";

export function hasClerkKeys(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      source.CLERK_SECRET_KEY?.trim(),
  );
}

/**
 * Resolve the active auth provider.
 *
 * - E2E defaults to legacy (local OTP + test routes).
 * - Production/staging uses Clerk whenever keys are present (ignores a mistaken
 *   AUTH_PROVIDER=legacy that would leave the UI on Clerk while middleware is off).
 * - Local respects AUTH_PROVIDER; auto-enables Clerk when keys are present.
 */
export function resolveAuthProvider(
  source: Record<string, string | undefined> = process.env,
): AuthProvider {
  if (isE2ERuntime(source)) {
    if (source.AUTH_PROVIDER === "clerk" && hasClerkKeys(source)) {
      return "clerk";
    }
    return "legacy";
  }

  if (isProductionRuntime(source)) {
    if (hasClerkKeys(source) || source.AUTH_PROVIDER === "clerk") {
      return "clerk";
    }
    return "legacy";
  }

  const value = source.AUTH_PROVIDER?.trim().toLowerCase();
  if (value === "clerk") return "clerk";
  if (value === "legacy") return "legacy";
  if (hasClerkKeys(source) && resolveAppEnvironment(source) !== "e2e") {
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
