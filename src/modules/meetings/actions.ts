"use server";

import { z } from "zod";
import { requireAuthenticatedUser } from "@/modules/identity";
import { MeetingError } from "./errors";
import { createMeeting, markMeetingJoined } from "./service";

export type MeetingActionResult = { ok: true; id?: string } | { ok: false; code: string };

export async function createMeetingAction(input: {
  consultationId?: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  allowAudio?: boolean;
  allowVideo?: boolean;
}): Promise<MeetingActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    const parsed = z.object({
      consultationId: z.string().uuid().optional(),
      title: z.string().min(3).max(180),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime().optional(),
      allowAudio: z.boolean().optional(),
      allowVideo: z.boolean().optional(),
    }).parse(input);
    const result = await createMeeting({
      actorUserId: auth.userId,
      consultationId: parsed.consultationId,
      title: parsed.title,
      startsAt: new Date(parsed.startsAt),
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      allowAudio: parsed.allowAudio,
      allowVideo: parsed.allowVideo,
      requestId: auth.requestId,
    });
    return { ok: true, id: result.id };
  } catch (error) {
    if (error instanceof MeetingError || error instanceof z.ZodError) {
      return { ok: false, code: error instanceof MeetingError ? error.code : "invalid_input" };
    }
    return { ok: false, code: "forbidden" };
  }
}

export async function markMeetingJoinedAction(meetingId: string): Promise<MeetingActionResult> {
  try {
    const auth = await requireAuthenticatedUser();
    z.string().uuid().parse(meetingId);
    await markMeetingJoined(auth.userId, meetingId);
    return { ok: true };
  } catch (error) {
    return { ok: false, code: error instanceof MeetingError ? error.code : "invalid_input" };
  }
}
