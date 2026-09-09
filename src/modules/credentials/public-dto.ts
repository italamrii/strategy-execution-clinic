export const CREDENTIAL_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "SUSPENDED",
] as const;

export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export type PublicTrackIdentity = {
  slug: string;
  nameAr: string;
  nameEn: string;
  iconKey: string;
  role: "primary" | "secondary" | "group_leader" | "deputy";
};

export type VerificationSource = {
  publicCode: string;
  status: CredentialStatus;
  displayNameAr: string;
  displayNameEn: string | null;
  membershipTypeNameAr: string;
  membershipTypeNameEn: string;
  tracks: { nameAr: string; nameEn: string; slug?: string; iconKey?: string }[];
  primaryTrack: PublicTrackIdentity | null;
  isGroupLeader: boolean;
  memberSinceYear: number;
  issuedAt: string;
  approvedVolunteerHours: number | null;
  hoursPublic: boolean;
  badges: { nameAr: string; nameEn: string; slug?: string }[];
  photoUrl: string | null;
  email?: string;
  phone?: string;
  adminNotes?: string;
  internalUserId?: string;
};

export type PublicVerificationDto = {
  verified: boolean;
  publicCode: string;
  status: CredentialStatus;
  displayNameAr: string;
  displayNameEn: string | null;
  membershipTypeNameAr: string;
  membershipTypeNameEn: string;
  tracks: { nameAr: string; nameEn: string; slug?: string; iconKey?: string }[];
  primaryTrack: PublicTrackIdentity | null;
  isGroupLeader: boolean;
  memberSinceYear: number;
  issuedAt: string;
  approvedVolunteerHours: number | null;
  badges: { nameAr: string; nameEn: string; slug?: string }[];
  photoUrl: string | null;
};

export function toPublicVerificationDto(
  source: VerificationSource,
): PublicVerificationDto {
  const { email, phone, adminNotes, internalUserId, hoursPublic, ...safe } = source;
  void email;
  void phone;
  void adminNotes;
  void internalUserId;
  void hoursPublic;
  return {
    verified: source.status === "ACTIVE",
    publicCode: safe.publicCode,
    status: safe.status,
    displayNameAr: safe.displayNameAr,
    displayNameEn: safe.displayNameEn,
    membershipTypeNameAr: safe.membershipTypeNameAr,
    membershipTypeNameEn: safe.membershipTypeNameEn,
    tracks: safe.tracks,
    primaryTrack: safe.primaryTrack,
    isGroupLeader: safe.isGroupLeader,
    memberSinceYear: safe.memberSinceYear,
    issuedAt: safe.issuedAt,
    approvedVolunteerHours: source.hoursPublic ? source.approvedVolunteerHours : null,
    badges: safe.badges,
    photoUrl: safe.photoUrl,
  };
}

export function publicDtoLeaksPrivate(dto: object): boolean {
  const serialized = JSON.stringify(dto);
  return ["email", "phone", "adminNotes", "internalUserId"].some((key) =>
    serialized.includes(`"${key}"`),
  );
}
