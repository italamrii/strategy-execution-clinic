import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { writeAudit } from "@/modules/audit";
import { requireAnyPermission } from "@/modules/identity";
import { getDb } from "@/shared/db/client";
import { membershipCardTemplates } from "@/shared/db/schema";
import type { CardDesign } from "./card-svg";

export const DEFAULT_CARD_DESIGN: CardDesign = {
  background: "#071526",
  surface: "#0B1D33",
  accent: "#C9A45F",
  text: "#F7F3EA",
  muted: "#C6B994",
  showSeal: true,
  showMemberSince: true,
  showBenefits: true,
  frontTaglineAr: "من التشخيص... إلى التنفيذ... إلى الأثر",
  frontTaglineEn: "From diagnosis to execution to impact",
};

export async function getActiveCardTemplate(membershipTypeId: string) {
  const db = getDb();
  const specific = await db.query.membershipCardTemplates.findFirst({
    where: and(
      eq(membershipCardTemplates.membershipTypeId, membershipTypeId),
      eq(membershipCardTemplates.status, "active"),
    ),
    orderBy: [desc(membershipCardTemplates.version)],
  });
  const fallback = specific ?? await db.query.membershipCardTemplates.findFirst({
    where: and(isNull(membershipCardTemplates.membershipTypeId), eq(membershipCardTemplates.status, "active")),
    orderBy: [desc(membershipCardTemplates.version)],
  });
  return fallback ? { ...fallback, config: fallback.config as CardDesign } : { id: "default", config: DEFAULT_CARD_DESIGN };
}

export async function listCardTemplatesForAdmin() {
  const db = getDb();
  return db.query.membershipCardTemplates.findMany({ orderBy: [asc(membershipCardTemplates.slug), desc(membershipCardTemplates.version)] });
}

export async function saveCardTemplate(input: {
  actorUserId: string;
  templateId?: string;
  membershipTypeId?: string | null;
  slug: string;
  nameAr: string;
  nameEn: string;
  status: "draft" | "active" | "archived";
  config: CardDesign;
  requestId?: string | null;
}) {
  await requireAnyPermission(input.actorUserId, ["card.template.manage", "credential.template.manage"]);
  const db = getDb();
  if (input.status === "active") {
    const activeRows = await db.query.membershipCardTemplates.findMany({
      where: input.membershipTypeId
        ? and(eq(membershipCardTemplates.membershipTypeId, input.membershipTypeId), eq(membershipCardTemplates.status, "active"))
        : and(isNull(membershipCardTemplates.membershipTypeId), eq(membershipCardTemplates.status, "active")),
    });
    for (const row of activeRows) {
      if (row.id !== input.templateId) {
        await db.update(membershipCardTemplates).set({ status: "archived", updatedAt: new Date(), updatedBy: input.actorUserId }).where(eq(membershipCardTemplates.id, row.id));
      }
    }
  }
  let id = input.templateId;
  if (id) {
    await db.update(membershipCardTemplates).set({
      membershipTypeId: input.membershipTypeId ?? null,
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      status: input.status,
      config: input.config,
      updatedBy: input.actorUserId,
      updatedAt: new Date(),
    }).where(eq(membershipCardTemplates.id, id));
  } else {
    id = uuidv7();
    const latest = await db.query.membershipCardTemplates.findFirst({
      where: eq(membershipCardTemplates.slug, input.slug),
      orderBy: [desc(membershipCardTemplates.version)],
    });
    await db.insert(membershipCardTemplates).values({
      id,
      membershipTypeId: input.membershipTypeId ?? null,
      slug: input.slug,
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      version: (latest?.version ?? 0) + 1,
      status: input.status,
      config: input.config,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    });
  }
  await writeAudit({ actorUserId: input.actorUserId, action: "CARD_TEMPLATE_SAVED", resourceType: "membership_card_template", resourceId: id, requestId: input.requestId, after: { status: input.status, slug: input.slug } });
  return { id };
}
