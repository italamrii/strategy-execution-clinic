export type MeetingJoinSession = {
  domain: string;
  origin: string;
  roomName: string;
  jwt: string;
  displayName: string;
};

/** Documented JitsiMeetExternalAPI constructor options. jwt is a top-level option, not a hash fragment we concatenate. */
export function jitsiExternalApiOptions(
  session: MeetingJoinSession,
  extras: { startWithCameraOff: boolean; lang: "ar" | "en" },
) {
  return {
    roomName: session.roomName,
    jwt: session.jwt,
    lang: extras.lang,
    width: "100%",
    height: "100%",
    userInfo: { displayName: session.displayName },
    configOverwrite: {
      prejoinPageEnabled: true,
      disableDeepLinking: true,
      fileRecordingsEnabled: false,
      liveStreamingEnabled: false,
      startWithVideoMuted: extras.startWithCameraOff,
    },
  };
}

export function jitsiExternalApiScriptUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/external_api.js`;
}
