import { describe, expect, it } from "vitest";
import { generatePublicMembershipCode, isSequentialLookingCode, isValidPublicCodeFormat } from "./public-code";
import { publicDtoLeaksPrivate, toPublicVerificationDto } from "./public-dto";
import { effectiveCredentialStatus, mapMembershipStatusToCredential } from "./states";

describe("public membership codes", () => {
  it("uses a non-sequential six-character suffix", () => {
    const code = generatePublicMembershipCode({
      typeCode: "VOL",
      year: 2026,
      entropy: Uint8Array.from([7, 18, 3, 29, 11, 42, 8, 19]),
    });
    expect(code.startsWith("SEC-VOL-2026-")).toBe(true);
    expect(code.split("-")[3]).toHaveLength(6);
    expect(isSequentialLookingCode(code)).toBe(false);
  });
});

describe("public verification DTO", () => {
  const source = {
    publicCode: "SEC-VOL-2026-K7M4QX",
    status: "REVOKED" as const,
    displayNameAr: "عبدالله العمري",
    displayNameEn: "Abdullah Alamri",
    membershipTypeNameAr: "عضو متطوع",
    membershipTypeNameEn: "Volunteer Member",
    tracks: [{ nameAr: "مسار الذكاء الاصطناعي والأتمتة", nameEn: "AI & Automation" }],
    memberSinceYear: 2026,
    issuedAt: "2026-01-15T00:00:00.000Z",
    approvedVolunteerHours: 84,
    hoursPublic: true,
    badges: [{ nameAr: "مساهم", nameEn: "Contributor" }],
    photoUrl: null,
    email: "secret@example.com",
    phone: "+966500000000",
    adminNotes: "internal",
    internalUserId: "user-1",
  };

  it("never exposes private fields", () => {
    const dto = toPublicVerificationDto(source);
    expect(publicDtoLeaksPrivate(dto)).toBe(false);
    expect(JSON.stringify(dto)).not.toContain("secret@example.com");
    expect(JSON.stringify(dto)).not.toContain("internal");
  });

  it("does not mark a revoked credential as verified", () => {
    const dto = toPublicVerificationDto(source);
    expect(dto.verified).toBe(false);
    expect(dto.status).toBe("REVOKED");
  });

  it("hides hours when the member has not made them public", () => {
    const dto = toPublicVerificationDto({ ...source, status: "ACTIVE", hoursPublic: false });
    expect(dto.verified).toBe(true);
    expect(dto.approvedVolunteerHours).toBeNull();
  });
});

describe("credential lifecycle", () => {
  it("maps suspended membership to suspended credential verification", () => {
    expect(mapMembershipStatusToCredential("suspended")).toBe("suspended");
    const effective = effectiveCredentialStatus({
      credentialStatus: "active",
      membershipStatus: "suspended",
      expiresAt: null,
    });
    expect(effective).toBe("suspended");
  });

  it("maps revoked membership to revoked credential verification", () => {
    const effective = effectiveCredentialStatus({
      credentialStatus: "active",
      membershipStatus: "revoked",
      expiresAt: null,
    });
    expect(effective).toBe("revoked");
  });

  it("expires active credentials past expiresAt", () => {
    const effective = effectiveCredentialStatus({
      credentialStatus: "active",
      membershipStatus: "active",
      expiresAt: new Date("2020-01-01"),
      now: new Date("2026-01-01"),
    });
    expect(effective).toBe("expired");
  });
});

describe("public code validation", () => {
  it("accepts well-formed codes and rejects malformed codes", () => {
    expect(isValidPublicCodeFormat("SEC-VOL-2026-K7M4QX")).toBe(true);
    expect(isValidPublicCodeFormat("SEC-VOL-2026-ABCI01")).toBe(false);
    expect(isValidPublicCodeFormat("bad-code")).toBe(false);
  });
});
