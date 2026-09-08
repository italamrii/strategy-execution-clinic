import { eq } from "drizzle-orm";
import { writeAudit } from "@/modules/audit";
import { getDb } from "@/shared/db/client";
import { profileContacts, profiles, users } from "@/shared/db/schema";
import type { Locale } from "@/i18n/routing";
import { ignoreClientRoleEscalation } from "@/shared/security/authorization";

export type PublicProfileDto = {
  displayNameAr: string;
  displayNameEn: string | null;
  headlineAr: string | null;
  headlineEn: string | null;
  bioAr: string | null;
  bioEn: string | null;
  city: string | null;
  country: string | null;
  visibility: string;
  photoUrl: string | null;
};

export type PrivateAccountDto = {
  userId: string;
  email: string;
  locale: string;
  status: string;
  emailVerifiedAt: string | null;
  displayNameAr: string;
  displayNameEn: string | null;
  headlineAr: string | null;
  headlineEn: string | null;
  bioAr: string | null;
  bioEn: string | null;
  visibility: string;
  directoryOptIn: boolean;
  hoursPublic: boolean;
  legalName: string | null;
  phoneE164: string | null;
};

export function toPublicProfileDto(input: {
  profile: typeof profiles.$inferSelect;
  photoUrl?: string | null;
}): PublicProfileDto {
  return {
    displayNameAr: input.profile.displayNameAr,
    displayNameEn: input.profile.displayNameEn,
    headlineAr: input.profile.headlineAr,
    headlineEn: input.profile.headlineEn,
    bioAr: input.profile.bioAr,
    bioEn: input.profile.bioEn,
    city: input.profile.city,
    country: input.profile.country,
    visibility: input.profile.visibility,
    photoUrl: input.photoUrl ?? null,
  };
}

export function publicProfileLeaksPrivate(dto: object): boolean {
  const serialized = JSON.stringify(dto);
  return ["email", "phone", "adminNotes", "legalName", "userId", "role"].some((key) =>
    serialized.includes(`"${key}"`),
  );
}

export async function getPrivateAccount(userId: string): Promise<PrivateAccountDto | null> {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) {
    return null;
  }
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  const contact = await db.query.profileContacts.findFirst({
    where: eq(profileContacts.userId, userId),
  });
  if (!profile) {
    return null;
  }
  return {
    userId: user.id,
    email: user.email,
    locale: user.locale,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    displayNameAr: profile.displayNameAr,
    displayNameEn: profile.displayNameEn,
    headlineAr: profile.headlineAr,
    headlineEn: profile.headlineEn,
    bioAr: profile.bioAr,
    bioEn: profile.bioEn,
    visibility: profile.visibility,
    directoryOptIn: profile.directoryOptIn,
    hoursPublic: profile.hoursPublic,
    legalName: contact?.legalName ?? null,
    phoneE164: contact?.phoneE164 ?? null,
  };
}

export async function updateOwnProfile(input: {
  userId: string;
  requestId?: string | null;
  patch: Record<string, unknown>;
}): Promise<PrivateAccountDto> {
  const safe = ignoreClientRoleEscalation(input.patch);
  const db = getDb();
  const before = await getPrivateAccount(input.userId);

  await db
    .update(profiles)
    .set({
      displayNameAr:
        typeof safe.displayNameAr === "string"
          ? safe.displayNameAr
          : before?.displayNameAr,
      displayNameEn:
        typeof safe.displayNameEn === "string" || safe.displayNameEn === null
          ? (safe.displayNameEn as string | null)
          : before?.displayNameEn,
      headlineAr:
        typeof safe.headlineAr === "string" || safe.headlineAr === null
          ? (safe.headlineAr as string | null)
          : before?.headlineAr,
      headlineEn:
        typeof safe.headlineEn === "string" || safe.headlineEn === null
          ? (safe.headlineEn as string | null)
          : before?.headlineEn,
      bioAr:
        typeof safe.bioAr === "string" || safe.bioAr === null
          ? (safe.bioAr as string | null)
          : before?.bioAr,
      bioEn:
        typeof safe.bioEn === "string" || safe.bioEn === null
          ? (safe.bioEn as string | null)
          : before?.bioEn,
      visibility:
        typeof safe.visibility === "string" ? safe.visibility : before?.visibility,
      directoryOptIn:
        typeof safe.directoryOptIn === "boolean"
          ? safe.directoryOptIn
          : before?.directoryOptIn,
      hoursPublic:
        typeof safe.hoursPublic === "boolean" ? safe.hoursPublic : before?.hoursPublic,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, input.userId));

  if (typeof safe.legalName === "string" || safe.legalName === null) {
    await db
      .update(profileContacts)
      .set({
        legalName: safe.legalName as string | null,
        updatedAt: new Date(),
      })
      .where(eq(profileContacts.userId, input.userId));
  }

  const after = await getPrivateAccount(input.userId);
  await writeAudit({
    actorUserId: input.userId,
    action: "PROFILE_UPDATED",
    resourceType: "profile",
    resourceId: input.userId,
    requestId: input.requestId,
    before: before
      ? {
          displayNameAr: before.displayNameAr,
          visibility: before.visibility,
        }
      : null,
    after: after
      ? {
          displayNameAr: after.displayNameAr,
          visibility: after.visibility,
        }
      : null,
  });
  return after!;
}

export async function updateLocale(input: {
  userId: string;
  locale: Locale;
  requestId?: string | null;
}): Promise<void> {
  const db = getDb();
  const before = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
  await db
    .update(users)
    .set({ locale: input.locale, updatedAt: new Date() })
    .where(eq(users.id, input.userId));
  await writeAudit({
    actorUserId: input.userId,
    action: "LOCALE_CHANGED",
    resourceType: "user",
    resourceId: input.userId,
    requestId: input.requestId,
    before: { locale: before?.locale },
    after: { locale: input.locale },
  });
}
