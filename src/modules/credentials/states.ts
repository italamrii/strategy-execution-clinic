export const CREDENTIAL_DB_STATUSES = [
  "active",
  "suspended",
  "expired",
  "revoked",
] as const;

export type CredentialDbStatus = (typeof CREDENTIAL_DB_STATUSES)[number];

export const CREDENTIAL_PUBLIC_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "REVOKED",
] as const;

export type CredentialPublicStatus = (typeof CREDENTIAL_PUBLIC_STATUSES)[number];

export function toPublicCredentialStatus(
  status: CredentialDbStatus,
): CredentialPublicStatus {
  return status.toUpperCase() as CredentialPublicStatus;
}

export function toDbCredentialStatus(
  status: CredentialPublicStatus,
): CredentialDbStatus {
  return status.toLowerCase() as CredentialDbStatus;
}

export const CARD_DESIGN_VERSION = "CARD_DESIGN_V1" as const;

export function mapMembershipStatusToCredential(
  membershipStatus: string,
): CredentialDbStatus {
  switch (membershipStatus) {
    case "active":
      return "active";
    case "suspended":
      return "suspended";
    case "expired":
      return "expired";
    case "revoked":
      return "revoked";
    default:
      return "revoked";
  }
}

export function effectiveCredentialStatus(input: {
  credentialStatus: CredentialDbStatus;
  membershipStatus: string;
  expiresAt: Date | null;
  now?: Date;
}): CredentialDbStatus {
  const now = input.now ?? new Date();
  const membershipMapped = mapMembershipStatusToCredential(input.membershipStatus);
  if (membershipMapped !== "active") {
    return membershipMapped;
  }
  if (input.credentialStatus !== "active") {
    return input.credentialStatus;
  }
  if (input.expiresAt && input.expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }
  return "active";
}
