export { MeetingError } from "./errors";
export {
  createMeeting,
  listMeetingsForUser,
  getMeetingForUser,
  markMeetingJoined,
  buildMeetingJoinSession,
  resolveMeetingProviderReadiness,
  updateMeetingStatus,
  usesDefaultPublicJitsi,
  meetingProviderSetup,
  canEnterPrivateConsultationMeeting,
} from "./service";
export type { MeetingJoinSession } from "./jitsi-external-api";
export { jitsiExternalApiOptions, jitsiExternalApiScriptUrl } from "./jitsi-external-api";
export { verifyJitsiProviderAuth } from "./probe";
