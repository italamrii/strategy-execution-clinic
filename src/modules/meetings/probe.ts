export type JitsiHostProbe = {
  /** External API and config.js were reachable. Not a JWT or tokenAuth attestation. */
  reachable: boolean;
  reasons: string[];
};

export const JITSI_PROBE_NOT_ATTESTATION =
  "This probe is a connectivity/configuration diagnostic, not a security attestation.";

const INCONCLUSIVE_AUTH_SIGNALS =
  /not-authorized|policy-violation|authentication required|item-not-found/;

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
 * Connectivity and configuration diagnostic for a private Jitsi host.
 * Does not prove JWT enforcement. HTTP 401/403, item-not-found, and
 * policy-violation are recorded as inconclusive, not as tokenAuth proof.
 */
export async function probeJitsiHost(
  origin: string,
  host: string,
  fetchImpl: typeof fetch = fetch,
): Promise<JitsiHostProbe> {
  const reasons: string[] = [];
  let apiOk = false;
  let configOk = false;

  let apiJs: { ok: boolean; status: number; body: string };
  try {
    apiJs = await readText(fetchImpl, `${origin}/external_api.js`);
  } catch {
    return {
      reachable: false,
      reasons: ["JITSI_DOMAIN did not serve /external_api.js", JITSI_PROBE_NOT_ATTESTATION],
    };
  }
  if (apiJs.ok && apiJs.body.includes("JitsiMeetExternalAPI")) {
    apiOk = true;
  } else {
    reasons.push("JITSI_DOMAIN /external_api.js is missing JitsiMeetExternalAPI");
  }

  let configJs: { ok: boolean; status: number; body: string };
  try {
    configJs = await readText(fetchImpl, `${origin}/config.js`);
  } catch {
    return {
      reachable: false,
      reasons: [...reasons, "JITSI_DOMAIN did not serve /config.js", JITSI_PROBE_NOT_ATTESTATION],
    };
  }
  if (!configJs.ok) {
    reasons.push("JITSI_DOMAIN /config.js was not reachable");
  } else {
    configOk = true;
    if (/\banonymousdomain\s*:/.test(configJs.body)) {
      reasons.push("config.js advertises anonymousdomain (unsigned guests may be allowed)");
    }
  }

  try {
    const bind = await readText(fetchImpl, `${origin}/http-bind`, {
      method: "POST",
      headers: { "content-type": "text/xml; charset=utf-8" },
      body: BOSH_BODY(host),
    });
    const bindText = bind.body.toLowerCase();
    const openedAnonymousSession = /(?:\s|")sid\s*=/.test(bind.body);
    const inconclusiveAuthSignal =
      bind.status === 401 ||
      bind.status === 403 ||
      INCONCLUSIVE_AUTH_SIGNALS.test(bindText);

    if (openedAnonymousSession) {
      reasons.push("Unauthenticated BOSH bind opened a session; review tokenAuth on the host");
    } else if (inconclusiveAuthSignal) {
      reasons.push(
        "BOSH returned 401/403, item-not-found, or policy-violation; that is not proof of JWT enforcement",
      );
    } else {
      reasons.push("BOSH /http-bind responded; the result is inconclusive for JWT enforcement");
    }
  } catch {
    reasons.push("BOSH /http-bind was not reachable");
  }

  reasons.push(JITSI_PROBE_NOT_ATTESTATION);
  return { reachable: apiOk && configOk, reasons };
}
