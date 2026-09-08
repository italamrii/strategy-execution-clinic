import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/shared/db/client";
import { rateLimitBuckets } from "@/shared/db/schema";

export class RateLimitError extends Error {
  readonly code = "RATE_LIMITED" as const;
  constructor(message = "rate_limited") {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function consumeRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / input.windowMs) * input.windowMs,
  );
  const db = getDb();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await db.query.rateLimitBuckets.findFirst({
      where: and(
        eq(rateLimitBuckets.bucketKey, input.key),
        eq(rateLimitBuckets.windowStart, windowStart),
      ),
    });

    if (!existing) {
      try {
        await db.insert(rateLimitBuckets).values({
          id: uuidv7(),
          bucketKey: input.key,
          windowStart,
          count: 1,
          updatedAt: now,
        });
        return;
      } catch {
        // Concurrent first insert — retry read/update path.
        continue;
      }
    }

    if (existing.count >= input.limit) {
      throw new RateLimitError();
    }

    await db
      .update(rateLimitBuckets)
      .set({ count: existing.count + 1, updatedAt: now })
      .where(eq(rateLimitBuckets.id, existing.id));
    return;
  }

  throw new RateLimitError("rate_limit_contention");
}
