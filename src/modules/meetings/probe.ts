export type JitsiAuthProbe = {
  verified: boolean;
  reasons: string[];
};

const BOSH_BODY = (host: string) =>
  `<body rid="1" xmlns="http://jabber.org/protocol/httpbind" to="${host}" xml:lang="en" wait="30" hold="1" ver="1.6" xmpp:version="1.0" xmlns:xmpp="urn:xmpp:xbosh"/>`;

async function readText(
  fetchImpl: typeof fetch,
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: string }> {
  const response = await fetchImpl(url, {
    ...init,
    redirect: "follow",
    signal: init?.signal ?? AbortSignal.timeout(5_000),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

/**
 * Confirms the conferencing host serves the External API and rejects an
 * unauthenticated BOSH bind. Env JWT secrets alone are not enough.
 */
export async function verifyJitsiProviderAuth(
  origin: string,
  host: string,
  fetchImpl: typeof fetch = fetch,
): Promise<JitsiAuthProbe> {
  const reasons: string[] = [];
  let apiJs: { ok: boolean; status: number; body: string };
  try {
    apiJs = await readText(fetchImpl, `${origin}/external_api.js`);
  } catch {
    return { verified: false, reasons: ["JITSI_DOMAIN did not serve /external_api.js"] };
  }
  if (!apiJs.ok || !apiJs.body.includes("JitsiMeetExternalAPI")) {
    reasons.push("JITSI_DOMAIN /external_api.js is missing JitsiMeetExternalAPI");
  }

  let configJs: { ok: boolean; status: number; body: string };
  try {
    configJs = await readText(fetchImpl, `${origin}/config.js`);
  } catch {
    return {
      verified: false,
      reasons: [...reasons, "JITSI_DOMAIN did not serve /config.js"],
    };
  }
  if (!configJs.ok) {
    reasons.push("JITSI_DOMAIN /config.js was not reachable");
  } else if (/\banonymousdomain\s*:/.test(configJs.body)) {
    reasons.push("config.js advertises anonymousdomain (unsigned guests can join)");
  }

  let bind: { ok: boolean; status: number; body: string };
  try {
    bind = await readText(fetchImpl, `${origin}/http-bind`, {
      method: "POST",
      headers: { "content-type": "text/xml; charset=utf-8" },
      body: BOSH_BODY(host),
    });
  } catch {
    return {
      verified: false,
      reasons: [...reasons, "Unauthenticated BOSH bind could not be reached at /http-bind"],
    };
  }

  const bindText = bind.body.toLowerCase();
  const rejectedAnonymous =
    bind.status === 401 ||
    bind.status === 403 ||
    /not-authorized|policy-violation|authentication required|item-not-found/.test(bindText);
  const acceptedAnonymous = /(?:\s|")sid\s*=/.test(bind.body) && !rejectedAnonymous;

  if (acceptedAnonymous) {
    reasons.push("Unauthenticated BOSH bind was accepted (JWT tokenAuth is not enforced)");
  } else if (!rejectedAnonymous) {
    reasons.push("Unauthenticated BOSH bind did not fail closed; JWT enforcement was not proven");
  }

  return { verified: reasons.length === 0, reasons };
}
