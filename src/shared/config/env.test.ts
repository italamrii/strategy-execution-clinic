import { describe, expect, it } from "vitest";
import { validateEnvironment } from "./env";

describe("environment validation", () => {
  it("allows local development defaults", () => {
    const result = validateEnvironment({
      NODE_ENV: "development",
      APP_ENV: "local",
      DATABASE_URL: "postgres://clinic:clinic@127.0.0.1:5432/clinic",
      AUTH_SECRET: "local-dev-secret-32-characters-min",
      EMAIL_PROVIDER: "console",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects production with test flags", () => {
    const result = validateEnvironment({
      NODE_ENV: "production",
      APP_ENV: "production",
      DATABASE_URL: "postgres://u:p@db.example.com/clinic",
      AUTH_SECRET: "production-secret-32-characters-minimum",
      APP_URL: "https://clinic.example.com",
      EMAIL_PROVIDER: "smtp",
      SMTP_HOST: "smtp.example.com",
      SMTP_FROM: "noreply@clinic.example.com",
      OBJECT_STORAGE_PROVIDER: "s3",
      S3_BUCKET: "clinic-private",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      E2E: "true",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("E2E"))).toBe(true);
    }
  });

  it("rejects production without https APP_URL", () => {
    const result = validateEnvironment({
      NODE_ENV: "production",
      APP_ENV: "production",
      DATABASE_URL: "postgres://u:p@db.example.com/clinic",
      AUTH_SECRET: "production-secret-32-characters-minimum",
      APP_URL: "http://clinic.example.com",
      EMAIL_PROVIDER: "smtp",
      SMTP_HOST: "smtp.example.com",
      SMTP_FROM: "noreply@clinic.example.com",
      OBJECT_STORAGE_PROVIDER: "s3",
      S3_BUCKET: "clinic-private",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects memory email provider in production", () => {
    const result = validateEnvironment({
      NODE_ENV: "production",
      APP_ENV: "production",
      DATABASE_URL: "postgres://u:p@db.example.com/clinic",
      AUTH_SECRET: "production-secret-32-characters-minimum",
      APP_URL: "https://clinic.example.com",
      EMAIL_PROVIDER: "memory",
      OBJECT_STORAGE_PROVIDER: "s3",
      S3_BUCKET: "clinic-private",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
    });
    expect(result.ok).toBe(false);
  });
});
