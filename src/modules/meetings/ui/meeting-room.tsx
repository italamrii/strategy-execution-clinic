"use client";

import { useEffect, useRef, useState } from "react";
import { markMeetingJoinedAction } from "../actions";
import {
  jitsiExternalApiOptions,
  jitsiExternalApiScriptUrl,
  type MeetingJoinSession,
} from "../jitsi-external-api";

type ExternalApi = {
  dispose: () => void;
  addListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

type ExternalApiCtor = new (domain: string, options: Record<string, unknown>) => ExternalApi;

function loadExternalApi(origin: string): Promise<ExternalApiCtor> {
  const existing = (window as Window & { JitsiMeetExternalAPI?: ExternalApiCtor }).JitsiMeetExternalAPI;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = jitsiExternalApiScriptUrl(origin);
    script.async = true;
    script.onload = () => {
      const ctor = (window as Window & { JitsiMeetExternalAPI?: ExternalApiCtor }).JitsiMeetExternalAPI;
      if (ctor) resolve(ctor);
      else reject(new Error("JitsiMeetExternalAPI missing after script load"));
    };
    script.onerror = () => reject(new Error("external_api.js failed to load"));
    document.head.appendChild(script);
  });
}

export function MeetingRoom({
  meetingId,
  session,
  startWithCameraOff,
  lang,
  connectionFailedLabel,
}: {
  meetingId: string;
  session: MeetingJoinSession;
  startWithCameraOff: boolean;
  lang: "ar" | "en";
  connectionFailedLabel: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void markMeetingJoinedAction(meetingId);
  }, [meetingId]);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    let api: ExternalApi | null = null;
    let cancelled = false;
    void loadExternalApi(session.origin)
      .then((JitsiMeetExternalAPI) => {
        if (cancelled || !parentRef.current) return;
        api = new JitsiMeetExternalAPI(session.domain, {
          ...jitsiExternalApiOptions(session, { startWithCameraOff, lang }),
          parentNode: parentRef.current,
        });
        api.addListener("connectionFailed", () => {
          if (!cancelled) setFailed(true);
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      api?.dispose();
    };
  }, [lang, session, startWithCameraOff]);

  if (failed) {
    return (
      <p className="mt-8 rounded-2xl bg-stone p-6 text-graphite" role="alert">
        {connectionFailedLabel}
      </p>
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-sand bg-canvas">
      <div ref={parentRef} data-testid="jitsi-external-api" className="h-[72vh] w-full" />
    </div>
  );
}
