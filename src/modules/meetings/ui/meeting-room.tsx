"use client";

import { useEffect } from "react";
import { markMeetingJoinedAction } from "../actions";

export function MeetingRoom({
  meetingId,
  title,
  embedUrl,
  startWithCameraOff,
}: {
  meetingId: string;
  title: string;
  embedUrl: string;
  startWithCameraOff: boolean;
}) {
  useEffect(() => {
    void markMeetingJoinedAction(meetingId);
  }, [meetingId]);
  const src = `${embedUrl}&config.startWithVideoMuted=${startWithCameraOff ? "true" : "false"}`;
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-sand bg-canvas">
      <iframe
        title={title}
        src={src}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="h-[72vh] w-full"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
