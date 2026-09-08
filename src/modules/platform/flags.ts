export const FLAG_KEYS = [
  "VOLUNTEERING",
  "BADGES",
  "PUBLIC_DIRECTORY",
  "EVENTS",
  "ORGANIZATIONS",
  "ASSESSMENTS",
  "AI",
  "PAYMENTS",
  "PARTNERS",
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];

function readEnvFlag(key: FlagKey, env: Record<string, string | undefined>): boolean {
  const raw = env[`FLAG_${key}`];
  if (raw === undefined) {
    return key === "VOLUNTEERING" || key === "BADGES";
  }
  return raw === "true" || raw === "1" || raw === "on";
}

export function isFlagEnabled(
  key: FlagKey,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  return readEnvFlag(key, env);
}

export function getFlagSnapshot(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
) {
  return Object.fromEntries(FLAG_KEYS.map((key) => [key, isFlagEnabled(key, env)])) as Record<
    FlagKey,
    boolean
  >;
}
