"use server";

import { headers } from "next/headers";
import { requireAuthenticatedPermission, requireAuthenticatedUser } from "@/modules/identity";
import { recordPolicyConsent, updateContentBlock } from "./service";

export async function updateContentBlockAction(input: {
  blockId: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  status: "draft" | "published";
}) {
  try {
    const auth = await requireAuthenticatedPermission("content.write");
    await updateContentBlock({
      actorUserId: auth.userId,
      blockId: input.blockId,
      patch: input,
      requestId: (await headers()).get("x-request-id"),
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}

export async function recordPolicyConsentAction(input: { slug: string; version: string }) {
  try {
    const auth = await requireAuthenticatedUser();
    await recordPolicyConsent({
      userId: auth.userId,
      slug: input.slug,
      version: input.version,
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}
