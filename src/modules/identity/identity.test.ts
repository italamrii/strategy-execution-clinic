import { describe, expect, it } from "vitest";
import {
  generateOtpCode,
  hashSecret,
  normalizeEmail,
  safeEqualHex,
} from "./crypto";
import {
  publicProfileLeaksPrivate,
  toPublicProfileDto,
} from "./profile/service";
import { profiles } from "@/shared/db/schema";

describe("identity crypto", () => {
  it("normalizes email", () => {
    expect(normalizeEmail("  Admin@Clinic.SA ")).toBe("admin@clinic.sa");
  });

  it("hashes OTP with timing-safe compare", () => {
    const code = generateOtpCode(6);
    expect(code).toMatch(/^\d{6}$/);
    const hash = hashSecret(code, "pepper");
    expect(safeEqualHex(hash, hashSecret(code, "pepper"))).toBe(true);
    expect(safeEqualHex(hash, hashSecret("000000", "pepper"))).toBe(false);
  });
});

describe("public profile DTO", () => {
  it("never exposes email or private fields", () => {
    const profile = {
      id: "p1",
      userId: "u1",
      displayNameAr: "عبدالله",
      displayNameEn: "Abdullah",
      headlineAr: null,
      headlineEn: null,
      bioAr: null,
      bioEn: null,
      photoMediaId: null,
      city: "Riyadh",
      country: "SA",
      visibility: "public",
      hoursPublic: false,
      directoryOptIn: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies typeof profiles.$inferSelect;

    const dto = toPublicProfileDto({ profile });
    expect(publicProfileLeaksPrivate(dto)).toBe(false);
    expect(JSON.stringify(dto)).not.toContain("u1");
    expect(JSON.stringify(dto)).not.toContain("email");
  });
});
