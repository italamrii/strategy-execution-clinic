import { and, asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { requirePermission } from "@/modules/identity";
import { getDb } from "@/shared/db/client";
import { consentRecords, contentBlocks } from "@/shared/db/schema";
import { sanitizeRichText, sanitizePlainText } from "@/modules/notifications/sanitize";
import { CONTENT_SEEDS } from "./editorial";

export { CONTENT_SEEDS, contentHasUnresolvedFields } from "./editorial";
export const CONTENT_KINDS = ["PAGE", "SECTION", "FAQ"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** Previous factory copy only. Never overwrite admin-edited blocks. */
const LEGACY_FACTORY_HOME_HERO = {
  titleAr: "عيادة الاستراتيجية والتنفيذ",
  titleEn: "Strategy & Execution Clinic",
  bodyAr: "منظومة مهنية للعضوية والتطوع والاعتمادات القابلة للتحقق.",
  bodyEn: "A professional ecosystem for membership, volunteering, and verifiable credentials.",
} as const;

function shouldRefreshFactoryCopy(row: {
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  updatedBy: string | null;
}) {
  if (row.updatedBy) return false;
  if (row.slug === "home.hero") {
    return (
      row.titleAr === LEGACY_FACTORY_HOME_HERO.titleAr &&
      row.titleEn === LEGACY_FACTORY_HOME_HERO.titleEn &&
      row.bodyAr === LEGACY_FACTORY_HOME_HERO.bodyAr &&
      row.bodyEn === LEGACY_FACTORY_HOME_HERO.bodyEn
    );
  }
  if (row.slug === "contact.info") {
    return row.bodyAr.includes("@") || row.bodyEn.includes("@");
  }
  if (row.slug === "about.clinic" && row.bodyAr.length < 180) return true;
  if ((row.slug === "legal.privacy" || row.slug === "legal.terms") && !row.bodyAr.includes("[[UNRESOLVED:")) {
    return row.bodyAr.startsWith("[مسودة") || row.bodyEn.startsWith("[Administrative draft");
  }
  return false;
}

export async function seedContentCatalog() {
  const db = getDb();
  for (const seed of CONTENT_SEEDS) {
    const existing = await db.query.contentBlocks.findFirst({
      where: eq(contentBlocks.slug, seed.slug),
    });
    if (!existing) {
      await db.insert(contentBlocks).values({
        id: uuidv7(),
        slug: seed.slug,
        kind: seed.kind,
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        bodyAr: seed.bodyAr,
        bodyEn: seed.bodyEn,
        status: seed.status,
        sortOrder: seed.sortOrder,
        publishedAt: seed.status === "published" ? new Date() : null,
      });
      continue;
    }
    if (shouldRefreshFactoryCopy(existing)) {
      await db
        .update(contentBlocks)
        .set({
          titleAr: seed.titleAr,
          titleEn: seed.titleEn,
          bodyAr: seed.bodyAr,
          bodyEn: seed.bodyEn,
          status: seed.status,
          publishedAt: seed.status === "published" ? existing.publishedAt ?? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(contentBlocks.id, existing.id));
    }
  }
}

export async function getContentBySlug(slug: string) {
  const db = getDb();
  return db.query.contentBlocks.findFirst({
    where: eq(contentBlocks.slug, slug),
  });
}

export async function listPublishedPolicyPages() {
  const db = getDb();
  const slugs = [
    "legal.privacy",
    "legal.terms",
    "legal.membership",
    "legal.conduct",
    "legal.consultations",
    "legal.meetings",
    "legal.content",
  ];
  const rows = await db.query.contentBlocks.findMany({
    orderBy: [asc(contentBlocks.sortOrder)],
  });
  return rows.filter((row) => slugs.includes(row.slug));
}

export async function recordPolicyConsent(input: {
  userId: string;
  slug: string;
  version: string;
}) {
  const db = getDb();
  await db.insert(consentRecords).values({
    id: uuidv7(),
    userId: input.userId,
    purpose: `policy:${input.slug}:${input.version}`,
    granted: true,
  });
}

export async function getPublishedContentBySlug(slug: string) {
  const db = getDb();
  return db.query.contentBlocks.findFirst({
    where: and(eq(contentBlocks.slug, slug), eq(contentBlocks.status, "published")),
  });
}

export async function listContentBlocksForAdmin() {
  const db = getDb();
  return db.query.contentBlocks.findMany({
    orderBy: [asc(contentBlocks.sortOrder), asc(contentBlocks.slug)],
  });
}

export async function updateContentBlock(input: {
  actorUserId: string;
  blockId: string;
  patch: {
    titleAr?: string;
    titleEn?: string;
    bodyAr?: string;
    bodyEn?: string;
    status?: "draft" | "published";
    sortOrder?: number;
  };
  requestId?: string | null;
}) {
  await requirePermission(input.actorUserId, "content.write");
  const db = getDb();
  const row = await db.query.contentBlocks.findFirst({
    where: eq(contentBlocks.id, input.blockId),
  });
  if (!row) throw new Error("content_not_found");
  const titleAr = sanitizePlainText(input.patch.titleAr ?? row.titleAr, 300);
  const titleEn = sanitizePlainText(input.patch.titleEn ?? row.titleEn, 300);
  const bodyAr = sanitizeRichText(input.patch.bodyAr ?? row.bodyAr);
  const bodyEn = sanitizeRichText(input.patch.bodyEn ?? row.bodyEn);
  const status = input.patch.status ?? row.status;
  const sortOrder = input.patch.sortOrder ?? row.sortOrder;
  await db
    .update(contentBlocks)
    .set({
      titleAr,
      titleEn,
      bodyAr,
      bodyEn,
      status,
      sortOrder,
      updatedBy: input.actorUserId,
      publishedAt: status === "published" ? row.publishedAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(contentBlocks.id, row.id));
  await writeAudit({
    actorUserId: input.actorUserId,
    action: status === "published" ? "CONTENT_PUBLISHED" : "CONTENT_UPDATED",
    resourceType: "content_block",
    resourceId: row.id,
    after: { slug: row.slug, status },
    requestId: input.requestId,
  });
}
