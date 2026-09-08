import { z } from "zod";
import { isE2ERuntime, isProductionRuntime, isStrictProduction, resolveAppEnvironment } from "./runtime";

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  APP_ENV: z.enum(["local", "e2e", "staging", "production"]).optional(),
  APP_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  EMAIL_PROVIDER: z.enum(["console", "memory", "smtp"]).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BUCKET: z.string().optional(),
  OBJECT_STORAGE_PROVIDER: z.enum(["local", "s3"]).optional(),
  E2E: z.string().optional(),
  ENABLE_TEST_OTP_ENDPOINT: z.string().optional(),
  EMAIL_CAPTURE: z.string().optional(),
  AUTH_DEV_LOG_OTP: z.string().optional(),
  OPS_READINESS_TOKEN: z.string().optional(),
  ERROR_TRACKING_DSN: z.string().optional(),
});

export type EnvValidationResult =
  | { ok: true; environment: ReturnType<typeof resolveAppEnvironment> }
  | { ok: false; errors: string[] };

function productionErrors(env: z.infer<typeof baseSchema>): string[] {
  const errors: string[] = [];
  if (!env.DATABASE_URL) errors.push("DATABASE_URL is required in production");
  if (!env.APP_URL) errors.push("APP_URL is required in production (HTTPS origin)");
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) {
    errors.push("AUTH_SECRET must be at least 32 characters in production");
  }
  if (env.APP_URL && !env.APP_URL.startsWith("https://")) {
    errors.push("APP_URL must use https:// in production");
  }
  if (env.E2E === "true") errors.push("E2E=true is forbidden in production");
  if (env.ENABLE_TEST_OTP_ENDPOINT === "true") {
    errors.push("ENABLE_TEST_OTP_ENDPOINT=true is forbidden in production");
  }
  if (env.EMAIL_CAPTURE === "true") errors.push("EMAIL_CAPTURE=true is forbidden in production");
  if (env.AUTH_DEV_LOG_OTP === "true") errors.push("AUTH_DEV_LOG_OTP=true is forbidden in production");
  if (env.EMAIL_PROVIDER === "memory" || env.EMAIL_PROVIDER === "console") {
    errors.push(`EMAIL_PROVIDER=${env.EMAIL_PROVIDER} is forbidden in production; use smtp`);
  }
  if (env.EMAIL_PROVIDER === "smtp") {
    if (!env.SMTP_HOST) errors.push("SMTP_HOST is required when EMAIL_PROVIDER=smtp");
    if (!env.SMTP_FROM && !env.EMAIL_FROM) {
      errors.push("SMTP_FROM or EMAIL_FROM is required when EMAIL_PROVIDER=smtp");
    }
  }
  const storage = env.OBJECT_STORAGE_PROVIDER ?? (env.S3_BUCKET ? "s3" : "local");
  if (storage === "local") {
    errors.push("OBJECT_STORAGE_PROVIDER=local is forbidden in production; use s3");
  }
  if (storage === "s3") {
    if (!env.S3_BUCKET) errors.push("S3_BUCKET is required for object storage");
    if (!env.S3_ACCESS_KEY_ID) errors.push("S3_ACCESS_KEY_ID is required for object storage");
    if (!env.S3_SECRET_ACCESS_KEY) errors.push("S3_SECRET_ACCESS_KEY is required for object storage");
  }
  return errors;
}

export function validateEnvironment(
  source: Record<string, string | undefined> = process.env,
): EnvValidationResult {
  const parsed = baseSchema.safeParse(source);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  const environment = resolveAppEnvironment(source);
  if (isProductionRuntime(source)) {
    const errors = productionErrors(parsed.data);
    if (errors.length) return { ok: false, errors };
  }
  if (isE2ERuntime(source) && isStrictProduction(source)) {
    return { ok: false, errors: ["E2E runtime cannot run in production APP_ENV"] };
  }
  return { ok: true, environment };
}

export function assertProductionSafeStartup(
  source: Record<string, string | undefined> = process.env,
): void {
  const result = validateEnvironment(source);
  if (!result.ok) {
    const message = `Environment validation failed:\n${result.errors.map((e) => `  - ${e}`).join("\n")}`;
    throw new Error(message);
  }
}
