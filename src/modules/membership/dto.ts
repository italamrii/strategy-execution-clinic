import type { ApplicationStatus, MembershipStatus } from "./states";

export type MembershipTypeDto = {
  id: string;
  slug: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isEnabled: boolean;
  applicationsOpen: boolean;
  invitationOnly: boolean;
  visibility: string;
  validityMode: string;
  validityDays: number | null;
  renewalRequired: boolean;
  sortOrder: number;
};

export type TrackDto = {
  id: string;
  slug: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isEnabled: boolean;
  sortOrder: number;
};

export type MemberApplicationDto = {
  id: string;
  status: ApplicationStatus;
  membershipType: Pick<MembershipTypeDto, "id" | "slug" | "nameAr" | "nameEn" | "code">;
  tracks: Array<Pick<TrackDto, "id" | "slug" | "nameAr" | "nameEn">>;
  headline: string | null;
  summary: string | null;
  motivation: string | null;
  experience: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  additionalNotes: string | null;
  decisionReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: Array<{
    action: string;
    fromStatus: string;
    toStatus: string;
    reason: string | null;
    createdAt: string;
  }>;
};

export type AdminApplicationDto = MemberApplicationDto & {
  userId: string;
  reviewerId: string | null;
  internalNotes: string | null;
};

export type MemberMembershipDto = {
  id: string;
  status: MembershipStatus;
  membershipType: Pick<MembershipTypeDto, "id" | "slug" | "nameAr" | "nameEn" | "code">;
  tracks: Array<Pick<TrackDto, "id" | "slug" | "nameAr" | "nameEn">>;
  issuedAt: string;
  startsAt: string;
  endsAt: string | null;
  sourceApplicationId: string | null;
};

export type PublicMembershipTypeDto = Pick<
  MembershipTypeDto,
  | "id"
  | "slug"
  | "code"
  | "nameAr"
  | "nameEn"
  | "descriptionAr"
  | "descriptionEn"
  | "applicationsOpen"
  | "invitationOnly"
  | "sortOrder"
>;

export function toMembershipTypeDto(row: {
  id: string;
  slug: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isEnabled: boolean;
  applicationsOpen: boolean;
  invitationOnly: boolean;
  visibility: string;
  validityMode: string;
  validityDays: number | null;
  renewalRequired: boolean;
  sortOrder: number;
}): MembershipTypeDto {
  return {
    id: row.id,
    slug: row.slug,
    code: row.code,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
    isEnabled: row.isEnabled,
    applicationsOpen: row.applicationsOpen,
    invitationOnly: row.invitationOnly,
    visibility: row.visibility,
    validityMode: row.validityMode,
    validityDays: row.validityDays,
    renewalRequired: row.renewalRequired,
    sortOrder: row.sortOrder,
  };
}

export function toPublicMembershipTypeDto(row: MembershipTypeDto): PublicMembershipTypeDto {
  return {
    id: row.id,
    slug: row.slug,
    code: row.code,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
    applicationsOpen: row.applicationsOpen,
    invitationOnly: row.invitationOnly,
    sortOrder: row.sortOrder,
  };
}

export function toTrackDto(row: {
  id: string;
  slug: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isEnabled: boolean;
  sortOrder: number;
}): TrackDto {
  return {
    id: row.id,
    slug: row.slug,
    code: row.code,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
    isEnabled: row.isEnabled,
    sortOrder: row.sortOrder,
  };
}

/** Member-facing DTO — never includes internalNotes or reviewer identity. */
export function assertNoInternalLeak(dto: Record<string, unknown>): void {
  if ("internalNotes" in dto && dto.internalNotes !== undefined) {
    throw new Error("internal_notes_leak");
  }
}
