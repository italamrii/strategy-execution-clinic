import { describe, expect, it } from "vitest";
import { validateEnvironment } from "@/shared/config/env";
import { isTestEndpointsEnabled } from "@/shared/config/runtime";

describe("phase 7 production security", () => {
  it("blocks test endpoints when simulating production env", () => {
    const env = {
      APP_ENV: "production",
      NODE_ENV: "production",
      E2E: "false",
      ENABLE_TEST_OTP_ENDPOINT: "false",
      DATABASE_URL: "postgres://u:p@db.example.com/clinic",
      AUTH_SECRET: "production-secret-32-characters-minimum",
      APP_URL: "https://clinic.example.com",
      EMAIL_PROVIDER: "smtp",
      SMTP_HOST: "smtp.example.com",
      SMTP_FROM: "noreply@clinic.example.com",
      OBJECT_STORAGE_PROVIDER: "s3",
      S3_BUCKET: "clinic",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
    };
    expect(isTestEndpointsEnabled()).toBe(false);
    const result = validateEnvironment(env);
    expect(result.ok).toBe(true);
  });
});
