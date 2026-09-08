export type AppEnvironment = "local" | "e2e" | "staging" | "production";

export function resolveAppEnvironment(
  source: Record<string, string | undefined> = process.env,
): AppEnvironment {
  const explicit = source.APP_ENV?.toLowerCase();
  if (explicit === "staging" || explicit === "production" || explicit === "local" || explicit === "e2e") {
    return explicit;
  }
  if (source.E2E === "true") return "e2e";
  if (source.NODE_ENV === "production") return "production";
  return "local";
}

export function isProductionRuntime(
  source: Record<string, string | undefined> = process.env,
): boolean {
  const env = resolveAppEnvironment(source);
  return env === "production" || env === "staging";
}

export function isStrictProduction(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return resolveAppEnvironment(source) === "production";
}

export function isE2ERuntime(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return source.E2E === "true" || resolveAppEnvironment(source) === "e2e";
}

export function isTestEndpointsEnabled(): boolean {
  return (
    process.env.ENABLE_TEST_OTP_ENDPOINT === "true" &&
    process.env.E2E === "true" &&
    !isStrictProduction()
  );
}
