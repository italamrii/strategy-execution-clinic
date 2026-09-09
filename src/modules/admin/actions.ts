"use server";

import { requireAuthenticatedAnyPermission, requireAuthenticatedPermission } from "@/modules/identity";
import {
  createAnnouncement,
  updateFeatureFlag,
  updateSystemSetting,
} from "./service";

export async function updateSystemSettingAction(input: {
  key: string;
  value: unknown;
}) {
  try {
    const auth = await requireAuthenticatedAnyPermission(["admin.settings.manage", "settings.manage"]);
    await updateSystemSetting({
      actorUserId: auth.userId,
      key: input.key,
      value: input.value,
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}

export async function updateFeatureFlagAction(input: { key: string; enabled: boolean }) {
  try {
    const auth = await requireAuthenticatedPermission("flag.write");
    await updateFeatureFlag({
      actorUserId: auth.userId,
      key: input.key,
      enabled: input.enabled,
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}

export async function createAnnouncementAction(input: {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  audience: string;
  severity?: string;
  ctaPath?: string | null;
}) {
  try {
    const auth = await requireAuthenticatedPermission("announcement.manage");
    await createAnnouncement({
      actorUserId: auth.userId,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      bodyAr: input.bodyAr,
      bodyEn: input.bodyEn,
      audience: input.audience,
      severity: input.severity,
      startAt: new Date(),
      ctaPath: input.ctaPath,
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}
