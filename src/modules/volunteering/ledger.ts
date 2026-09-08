import { eq } from "drizzle-orm";
import { getDb } from "@/shared/db/client";
import {
  volunteerHourAdjustments,
  volunteerHourEntries,
} from "@/shared/db/schema";
import { sumApprovedHours } from "./hours";

export async function recomputeApprovedHours(userId: string): Promise<number> {
  const db = getDb();
  const entries = await db.query.volunteerHourEntries.findMany({
    where: eq(volunteerHourEntries.userId, userId),
  });
  const adjustments = await db.query.volunteerHourAdjustments.findMany({
    where: eq(volunteerHourAdjustments.userId, userId),
  });
  return sumApprovedHours(
    entries.map((e) => ({
      hours: Number(e.hours),
      status: e.status as "pending" | "approved" | "rejected",
    })),
    adjustments.map((a) => ({ deltaHours: Number(a.deltaHours) })),
  );
}

export async function recomputePendingHours(userId: string): Promise<number> {
  const db = getDb();
  const entries = await db.query.volunteerHourEntries.findMany({
    where: eq(volunteerHourEntries.userId, userId),
  });
  return Number(
    entries
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + Number(e.hours), 0)
      .toFixed(2),
  );
}
