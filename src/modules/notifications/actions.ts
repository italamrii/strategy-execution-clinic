"use server";

import { headers } from "next/headers";
import { requireAuthenticatedUser } from "@/modules/identity";
import {
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreference,
} from "@/modules/notifications";

export type NotificationActionResult = { ok: true } | { ok: false; code: string };

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    await markNotificationRead({ userId: auth.userId, notificationId });
    return { ok: true };
  } catch {
    return { ok: false, code: "forbidden" };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    await markAllNotificationsRead(auth.userId);
    return { ok: true };
  } catch {
    return { ok: false, code: "forbidden" };
  }
}

export async function updateNotificationPreferenceAction(input: {
  category: string;
  channel: "email" | "in_app";
  enabled: boolean;
}): Promise<NotificationActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    await updateNotificationPreference({
      userId: auth.userId,
      ...input,
    });
    void headers();
    return { ok: true };
  } catch {
    return { ok: false, code: "forbidden" };
  }
}
