"use server";

import { z } from "zod";
import { requireAuthenticatedUser } from "@/modules/identity";
import { saveCardTemplate } from "./templates";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export async function saveCardTemplateAction(input: {
  templateId?: string;
  membershipTypeId?: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  status: "draft" | "active" | "archived";
  background: string;
  surface: string;
  accent: string;
  text: string;
  muted: string;
  frontTaglineAr: string;
  frontTaglineEn: string;
  showSeal: boolean;
  showMemberSince: boolean;
  showBenefits: boolean;
}) {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z.object({
      templateId: z.string().uuid().optional(), membershipTypeId: z.string().uuid().optional(),
      slug: z.string().regex(/^[a-z0-9-]+$/).max(80), nameAr: z.string().min(2).max(120), nameEn: z.string().min(2).max(120),
      status: z.enum(["draft", "active", "archived"]), background: color, surface: color, accent: color, text: color, muted: color,
      frontTaglineAr: z.string().max(180), frontTaglineEn: z.string().max(180), showSeal: z.boolean(), showMemberSince: z.boolean(), showBenefits: z.boolean(),
    }).parse(input);
    const { templateId, membershipTypeId, slug, nameAr, nameEn, status, ...config } = parsed;
    const result = await saveCardTemplate({ actorUserId: auth.userId, templateId, membershipTypeId, slug, nameAr, nameEn, status, config, requestId: auth.requestId });
    return { ok: true as const, id: result.id };
  } catch { return { ok: false as const, code: "invalid_or_forbidden" }; }
}
