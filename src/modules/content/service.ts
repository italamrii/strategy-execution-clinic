import { and, asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { requirePermission } from "@/modules/identity";
import { getDb } from "@/shared/db/client";
import { contentBlocks } from "@/shared/db/schema";
import { sanitizeRichText, sanitizePlainText } from "@/modules/notifications/sanitize";

export const CONTENT_KINDS = ["PAGE", "SECTION", "FAQ"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CONTENT_SEEDS = [
  {
    slug: "home.hero",
    kind: "SECTION" as const,
    titleAr: "نبني الاستراتيجية...\nونحوّلها إلى أثر قابل للقياس",
    titleEn: "We build strategy...\nand turn it into measurable impact.",
    bodyAr:
      "منظومة مهنية تجمع الخبرات في الاستراتيجية والتنفيذ والأداء، وتحوّل المعرفة والمساهمة والتطوع إلى أثر مهني موثّق.",
    bodyEn:
      "A professional ecosystem that unites expertise in strategy, execution, and performance — and turns knowledge, contribution, and volunteering into verified professional impact.",
    sortOrder: 10,
  },
  {
    slug: "about.clinic",
    kind: "PAGE" as const,
    titleAr: "عن العيادة",
    titleEn: "About the Clinic",
    bodyAr: "عيادة الاستراتيجية والتنفيذ منظومة مهنية للأفراد العاملين في الاستراتيجية والتنفيذ والأداء والتميز المؤسسي.",
    bodyEn: "Strategy & Execution Clinic is a professional ecosystem for people working in strategy, execution, performance, and institutional excellence.",
    sortOrder: 20,
  },
  {
    slug: "legal.privacy",
    kind: "PAGE" as const,
    titleAr: "سياسة الخصوصية",
    titleEn: "Privacy Policy",
    bodyAr: "[مسودة إدارية — تتطلب اعتماداً قانونياً نهائياً] توضح هذه الصفحة كيفية معالجة بيانات الأعضاء وفق سجل العيادة المعتمد.",
    bodyEn: "[Administrative draft — final legal approval required] This page describes how member data is handled according to the Clinic's authoritative records.",
    sortOrder: 30,
  },
  {
    slug: "legal.terms",
    kind: "PAGE" as const,
    titleAr: "شروط الاستخدام",
    titleEn: "Terms of Use",
    bodyAr: "[مسودة إدارية — تتطلب اعتماداً قانونياً نهائياً] استخدام المنصة يخضع لسياسات العيادة المعتمدة.",
    bodyEn: "[Administrative draft — final legal approval required] Use of the platform is governed by Clinic policies.",
    sortOrder: 40,
  },
  {
    slug: "contact.info",
    kind: "SECTION" as const,
    titleAr: "تواصل معنا",
    titleEn: "Contact",
    bodyAr: "support@clinic.test",
    bodyEn: "support@clinic.test",
    sortOrder: 50,
  },
] as const;

/** Previous factory copy only. Never overwrite admin-edited blocks. */
const LEGACY_FACTORY_HOME_HERO = {
  titleAr: "عيادة الاستراتيجية والتنفيذ",
  titleEn: "Strategy & Execution Clinic",
  bodyAr: "منظومة مهنية للعضوية والتطوع والاعتمادات القابلة للتحقق.",
  bodyEn: "A professional ecosystem for membership, volunteering, and verifiable credentials.",
} as const;

function isLegacyFactoryHomeHero(row: {
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  updatedBy: string | null;
}) {
  if (row.slug !== "home.hero") return false;
  if (row.updatedBy) return false;
  return (
    row.titleAr === LEGACY_FACTORY_HOME_HERO.titleAr &&
    row.titleEn === LEGACY_FACTORY_HOME_HERO.titleEn &&
    row.bodyAr === LEGACY_FACTORY_HOME_HERO.bodyAr &&
    row.bodyEn === LEGACY_FACTORY_HOME_HERO.bodyEn
  );
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
        status: "published",
        sortOrder: seed.sortOrder,
        publishedAt: new Date(),
      });
      continue;
    }
    if (isLegacyFactoryHomeHero(existing)) {
      await db
        .update(contentBlocks)
        .set({
          titleAr: seed.titleAr,
          titleEn: seed.titleEn,
          bodyAr: seed.bodyAr,
          bodyEn: seed.bodyEn,
          updatedAt: new Date(),
        })
        .where(eq(contentBlocks.id, existing.id));
    }
  }
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
