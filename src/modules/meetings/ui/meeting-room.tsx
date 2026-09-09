"use client";

import { useEffect } from "react";
import { markMeetingJoinedAction } from "../actions";

export function MeetingRoom({
  meetingId,
  title,
  embedUrl,
  allowVideo,
}: {
  meetingId: string;
  title: string;
  embedUrl: string;
  allowVideo: boolean;
}) {
  useEffect(() => {
    void markMeetingJoinedAction(meetingId);
  }, [meetingId]);
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-sand bg-canvas">
      <iframe
        title={title}
        src={`${embedUrl}&config.startWithVideoMuted=${allowVideo ? "false" : "true"}`}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="h-[72vh] w-full"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
