const PUBLIC_JITSI_HOSTS = new Set(["meet.jit.si", "8x8.vc"]);

export type MeetingProviderSetup = {
  secure: boolean;
  host: string | null;
  origin: string | null;
  missing: string[];
};

function parseJitsiOrigin(raw: string | undefined): URL | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function meetingProviderSetup(
  env: NodeJS.ProcessEnv = process.env,
): MeetingProviderSetup {
  const missing: string[] = [];
  const url = parseJitsiOrigin(env.JITSI_DOMAIN);
  if (!url) {
    missing.push("JITSI_DOMAIN (HTTPS origin of a private Jitsi host)");
  } else if (PUBLIC_JITSI_HOSTS.has(url.hostname)) {
    missing.push("JITSI_DOMAIN (private host; meet.jit.si is not access-controlled)");
  }
  if (!env.JITSI_JWT_APP_ID?.trim()) missing.push("JITSI_JWT_APP_ID");
  if (!env.JITSI_JWT_SECRET?.trim()) missing.push("JITSI_JWT_SECRET");
  return {
    secure: missing.length === 0,
    host: url?.hostname ?? null,
    origin: url?.origin ?? null,
    missing,
  };
}

export function usesDefaultPublicJitsi(env: NodeJS.ProcessEnv = process.env) {
  const url = parseJitsiOrigin(env.JITSI_DOMAIN ?? "meet.jit.si");
  return !env.JITSI_DOMAIN?.trim() || Boolean(url && PUBLIC_JITSI_HOSTS.has(url.hostname));
}

export function canEnterPrivateConsultationMeeting(
  env: NodeJS.ProcessEnv = process.env,
) {
  return meetingProviderSetup(env).secure;
}
