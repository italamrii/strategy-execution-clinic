"use server";

import { headers } from "next/headers";
import { requireAuthenticatedPermission } from "@/modules/identity";
import { updateContentBlock } from "./service";

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
