import { describe, expect, it } from "vitest";
import { planClerkUserMapping } from "./auth/clerk-sync";
import { validateEnvironment } from "@/shared/config/env";
import { resolveAuthProvider } from "@/shared/config/auth-provider";

describe("planClerkUserMapping", () => {
  const existing = {
    id: "11111111-1111-7111-8111-111111111111",
    email: "member@clinic.test",
    clerkUserId: null as string | null,
    status: "active",
    locale: "ar",
  };

  it("links an existing local user by normalized email", () => {
    const plan = planClerkUserMapping({
      clerkUserId: "user_clerk_1",
      email: "  Member@Clinic.TEST ",
      byClerkId: null,
      byEmail: existing,
    });
    expect(plan).toEqual({ action: "link", user: existing });
  });

  it("creates a new local user when no match exists", () => {
    const plan = planClerkUserMapping({
      clerkUserId: "user_clerk_2",
      email: "new@clinic.test",
      byClerkId: null,
      byEmail: null,
    });
    expect(plan).toEqual({ action: "create" });
  });

  it("reuses an existing clerk_user_id mapping without replacing the local UUID", () => {
    const linked = { ...existing, clerkUserId: "user_clerk_3" };
    const plan = planClerkUserMapping({
      clerkUserId: "user_clerk_3",
      email: "member@clinic.test",
      byClerkId: linked,
      byEmail: linked,
    });
    expect(plan.action).toBe("reuse");
    if (plan.action === "reuse") {
      expect(plan.user.id).toBe(existing.id);
      expect(plan.user.clerkUserId).toBe("user_clerk_3");
    }
  });

  it("flags email bound to a different Clerk user as a conflict", () => {
    const plan = planClerkUserMapping({
      clerkUserId: "user_clerk_new",
      email: "member@clinic.test",
      byClerkId: null,
      byEmail: { ...existing, clerkUserId: "user_clerk_old" },
    });
    expect(plan).toEqual({
      action: "conflict",
      reason: "email_bound_to_other_clerk_user",
    });
  });
});

describe("Clerk auth environment validation", () => {
  const productionBase = {
    NODE_ENV: "production",
    APP_ENV: "production",
    DATABASE_URL: "postgres://u:p@db.example.com/clinic",
    AUTH_SECRET: "production-secret-32-characters-minimum",
    APP_URL: "https://clinic.example.com",
    OBJECT_STORAGE_PROVIDER: "s3",
    S3_BUCKET: "clinic-private",
    S3_ACCESS_KEY_ID: "key",
    S3_SECRET_ACCESS_KEY: "secret",
  } as const;

  it("requires Clerk keys when AUTH_PROVIDER=clerk", () => {
    const result = validateEnvironment({
      ...productionBase,
      AUTH_PROVIDER: "clerk",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"))).toBe(
        true,
      );
      expect(result.errors.some((e) => e.includes("CLERK_SECRET_KEY"))).toBe(true);
    }
  });

  it("accepts Clerk auth without SMTP", () => {
    const result = validateEnvironment({
      ...productionBase,
      AUTH_PROVIDER: "clerk",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      CLERK_SECRET_KEY: "sk_test_example",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid or missing Clerk configuration for AUTH_PROVIDER=clerk in local", () => {
    const result = validateEnvironment({
      NODE_ENV: "development",
      APP_ENV: "local",
      AUTH_PROVIDER: "clerk",
      DATABASE_URL: "postgres://clinic:clinic@127.0.0.1:5432/clinic",
    });
    expect(result.ok).toBe(false);
  });

  it("keeps test OTP endpoints forbidden in production with Clerk", () => {
    const result = validateEnvironment({
      ...productionBase,
      AUTH_PROVIDER: "clerk",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      CLERK_SECRET_KEY: "sk_test_example",
      ENABLE_TEST_OTP_ENDPOINT: "true",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("ENABLE_TEST_OTP_ENDPOINT"))).toBe(true);
    }
  });

  it("resolves AUTH_PROVIDER=clerk explicitly", () => {
    expect(
      resolveAuthProvider({
        AUTH_PROVIDER: "clerk",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test",
        CLERK_SECRET_KEY: "sk_test",
      }),
    ).toBe("clerk");
  });
});

describe("suspended account mapping decision", () => {
  it("still returns link/reuse for suspended users so the sync layer can block them", () => {
    const suspended = {
      id: "22222222-2222-7222-8222-222222222222",
      email: "blocked@clinic.test",
      clerkUserId: "user_clerk_blocked",
      status: "suspended",
      locale: "ar",
    };
    const plan = planClerkUserMapping({
      clerkUserId: "user_clerk_blocked",
      email: "blocked@clinic.test",
      byClerkId: suspended,
      byEmail: suspended,
    });
    expect(plan.action).toBe("reuse");
    if (plan.action === "reuse") {
      expect(plan.user.status).toBe("suspended");
      expect(plan.user.id).toBe(suspended.id);
    }
  });
});
