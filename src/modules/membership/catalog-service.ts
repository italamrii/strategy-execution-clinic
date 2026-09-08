import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/shared/db/client";
import { membershipTypes, tracks } from "@/shared/db/schema";
import { writeAudit } from "@/modules/audit";
import { MEMBERSHIP_TYPE_SEED, TRACK_SEED } from "./catalog";

export async function seedMembershipCatalog(): Promise<void> {
  const db = getDb();

  for (const [index, type] of MEMBERSHIP_TYPE_SEED.entries()) {
    const existing = await db.query.membershipTypes.findFirst({
      where: eq(membershipTypes.slug, type.slug),
    });
    const invitationOnly =
      type.slug === "founding_member" ||
      type.slug === "strategic_partner" ||
      type.slug === "institutional_member";
    if (existing) {
      continue;
    }
    await db.insert(membershipTypes).values({
      id: uuidv7(),
      slug: type.slug,
      code: type.code,
      nameAr: type.nameAr,
      nameEn: type.nameEn,
      descriptionAr: null,
      descriptionEn: null,
      isEnabled: true,
      applicationsOpen: !invitationOnly,
      invitationOnly,
      visibility: "public",
      validityMode: "lifetime",
      validityDays: null,
      renewalRequired: false,
      sortOrder: index + 1,
    });
  }

  for (const [index, track] of TRACK_SEED.entries()) {
    const existing = await db.query.tracks.findFirst({
      where: eq(tracks.slug, track.slug),
    });
    if (existing) {
      continue;
    }
    await db.insert(tracks).values({
      id: uuidv7(),
      code: track.code,
      slug: track.slug,
      nameAr: track.nameAr,
      nameEn: track.nameEn,
      isEnabled: true,
      sortOrder: index + 1,
    });
  }
}

export async function listPublicMembershipTypes() {
  const db = getDb();
  return db.query.membershipTypes.findMany({
    where: eq(membershipTypes.isEnabled, true),
    orderBy: (fields, { asc }) => [asc(fields.sortOrder)],
  });
}

export async function listPublicTracks() {
  const db = getDb();
  return db.query.tracks.findMany({
    where: eq(tracks.isEnabled, true),
    orderBy: (fields, { asc }) => [asc(fields.sortOrder)],
  });
}

export async function listAllMembershipTypes() {
  const db = getDb();
  return db.query.membershipTypes.findMany({
    orderBy: (fields, { asc }) => [asc(fields.sortOrder)],
  });
}

export async function listAllTracks() {
  const db = getDb();
  return db.query.tracks.findMany({
    orderBy: (fields, { asc }) => [asc(fields.sortOrder)],
  });
}

export async function updateMembershipType(input: {
  actorUserId: string;
  typeId: string;
  patch: Partial<{
    nameAr: string;
    nameEn: string;
    descriptionAr: string | null;
    descriptionEn: string | null;
    isEnabled: boolean;
    applicationsOpen: boolean;
    invitationOnly: boolean;
    visibility: string;
    sortOrder: number;
    validityMode: string;
    validityDays: number | null;
    renewalRequired: boolean;
  }>;
  requestId?: string | null;
}) {
  const db = getDb();
  const before = await db.query.membershipTypes.findFirst({
    where: eq(membershipTypes.id, input.typeId),
  });
  if (!before) {
    throw new Error("membership_type_not_found");
  }
  await db
    .update(membershipTypes)
    .set({ ...input.patch, updatedAt: new Date() })
    .where(eq(membershipTypes.id, input.typeId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: input.patch.isEnabled === false ? "MEMBERSHIP_TYPE_DISABLED" : "MEMBERSHIP_TYPE_UPDATED",
    resourceType: "membership_type",
    resourceId: input.typeId,
    requestId: input.requestId,
    before: { slug: before.slug, isEnabled: before.isEnabled },
    after: input.patch,
  });
}

export async function updateTrack(input: {
  actorUserId: string;
  trackId: string;
  patch: Partial<{
    nameAr: string;
    nameEn: string;
    descriptionAr: string | null;
    descriptionEn: string | null;
    isEnabled: boolean;
    sortOrder: number;
  }>;
  requestId?: string | null;
}) {
  const db = getDb();
  const before = await db.query.tracks.findFirst({
    where: eq(tracks.id, input.trackId),
  });
  if (!before) {
    throw new Error("track_not_found");
  }
  await db
    .update(tracks)
    .set({ ...input.patch, updatedAt: new Date() })
    .where(eq(tracks.id, input.trackId));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: input.patch.isEnabled === false ? "TRACK_DISABLED" : "TRACK_UPDATED",
    resourceType: "track",
    resourceId: input.trackId,
    requestId: input.requestId,
    before: { slug: before.slug, isEnabled: before.isEnabled },
    after: input.patch,
  });
}
