import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { signJitsiJwt } from "./jitsi-jwt";
import {
  jitsiExternalApiOptions,
  jitsiExternalApiScriptUrl,
} from "./jitsi-external-api";
import { JITSI_PROBE_NOT_ATTESTATION, probeJitsiHost } from "./probe";
import {
  canEnterPrivateConsultationMeeting,
  JITSI_OPERATOR_VERIFIED_REQUIREMENT,
  meetingProviderSetup,
} from "./provider";
import { buildMeetingJoinSession, resolveMeetingProviderReadiness } from "./service";

function clearJitsiEnv() {
  delete process.env.JITSI_DOMAIN;
  delete process.env.JITSI_JWT_APP_ID;
  delete process.env.JITSI_JWT_SECRET;
  delete process.env.JITSI_JWT_ISSUER;
  delete process.env.JITSI_OPERATOR_VERIFIED;
}

function setPrivateJitsiConfig() {
  process.env.JITSI_DOMAIN = "https://meet.clinic.example";
  process.env.JITSI_JWT_APP_ID = "clinic";
  process.env.JITSI_JWT_SECRET = "super-secret";
}

function hostProbeFetch(bosh: { status: number; body: string }) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/external_api.js")) {
      return new Response("class JitsiMeetExternalAPI {}", { status: 200 });
    }
    if (url.endsWith("/config.js")) {
      return new Response("var config = { hosts: { domain: 'meet.clinic.example' } };", {
        status: 200,
      });
    }
    if (url.endsWith("/http-bind") && init?.method === "POST") {
      return new Response(bosh.body, { status: bosh.status });
    }
    return new Response("missing", { status: 404 });
  }) as unknown as typeof fetch;
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")) as {
    room: string;
    sub: string;
    aud: string;
    context: { user: { id: string } };
  };
}

afterEach(clearJitsiEnv);

describe("meeting provider setup", () => {
  it("rejects the public Jitsi host even when JWT values are present", () => {
    process.env.JITSI_DOMAIN = "meet.jit.si";
    process.env.JITSI_JWT_APP_ID = "clinic";
    process.env.JITSI_JWT_SECRET = "secret";
    const setup = meetingProviderSetup();
    expect(setup.secure).toBe(false);
    expect(canEnterPrivateConsultationMeeting()).toBe(false);
    expect(setup.missing.some((item) => item.includes("meet.jit.si"))).toBe(true);
  });

  it("rejects 8x8.vc and non-HTTPS hosts", () => {
    process.env.JITSI_DOMAIN = "http://meet.clinic.example";
    process.env.JITSI_JWT_APP_ID = "clinic";
    process.env.JITSI_JWT_SECRET = "secret";
    expect(meetingProviderSetup().secure).toBe(false);

    process.env.JITSI_DOMAIN = "https://8x8.vc";
    expect(meetingProviderSetup().secure).toBe(false);
  });

  it("requires JWT credentials on a private host", () => {
    process.env.JITSI_DOMAIN = "https://meet.clinic.example";
    const setup = meetingProviderSetup();
    expect(setup.secure).toBe(false);
    expect(setup.missing).toEqual(expect.arrayContaining(["JITSI_JWT_APP_ID", "JITSI_JWT_SECRET"]));
  });

  it("treats private JWT env as configuration only until the operator flag is set", () => {
    setPrivateJitsiConfig();
    const setup = meetingProviderSetup();
    expect(setup.secure).toBe(true);
    expect(setup.host).toBe("meet.clinic.example");
    expect(canEnterPrivateConsultationMeeting()).toBe(false);
    expect(resolveMeetingProviderReadiness().ready).toBe(false);
  });
});

describe("Jitsi JWT room scoping", () => {
  it("binds the token to one room and host", () => {
    const first = signJitsiJwt({
      appId: "clinic",
      secret: "super-secret",
      host: "meet.clinic.example",
      room: "sec-room-a",
      userId: "user-1",
      displayName: "Ada",
      moderator: true,
    });
    const second = signJitsiJwt({
      appId: "clinic",
      secret: "super-secret",
      host: "meet.clinic.example",
      room: "sec-room-b",
      userId: "user-1",
      displayName: "Ada",
      moderator: true,
    });
    expect(decodeJwtPayload(first).room).toBe("sec-room-a");
    expect(decodeJwtPayload(second).room).toBe("sec-room-b");
    expect(first).not.toEqual(second);
  });
});

describe("JitsiMeetExternalAPI jwt option", () => {
  it("does not construct an iframe src with jwt in the fragment", () => {
    setPrivateJitsiConfig();
    process.env.JITSI_OPERATOR_VERIFIED = "YES";
    const session = buildMeetingJoinSession("sec-room-key", {
      userId: "user-1",
      displayName: "Ada",
      moderator: true,
    });
    const options = jitsiExternalApiOptions(session, { startWithCameraOff: true, lang: "en" });
    expect(jitsiExternalApiScriptUrl(session.origin)).toBe(
      "https://meet.clinic.example/external_api.js",
    );
    expect(options.jwt).toBe(session.jwt);
    expect(options.roomName).toBe("sec-room-key");
    expect(JSON.stringify(options)).not.toContain("#jwt=");
    expect(JSON.stringify(options)).not.toContain("meet.jit.si");
    expect(options.configOverwrite.startWithVideoMuted).toBe(true);
    const payload = decodeJwtPayload(options.jwt);
    expect(payload.room).toBe("sec-room-key");
    expect(payload.sub).toBe("meet.clinic.example");
    expect(payload.aud).toBe("clinic");
    expect(payload.context.user.id).toBe("user-1");
  });

  it("loads JitsiMeetExternalAPI instead of constructing an iframe src", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/modules/meetings/ui/meeting-room.tsx"),
      "utf8",
    );
    expect(source).toContain("new JitsiMeetExternalAPI");
    expect(source).toContain("jitsiExternalApiOptions");
    expect(source).not.toMatch(/iframe/i);
    expect(source).not.toMatch(/#jwt=/);
  });

  it("throws before minting a session when the provider env is incomplete", () => {
    expect(() =>
      buildMeetingJoinSession("sec-room-key", {
        userId: "user-1",
        displayName: "Ada",
        moderator: false,
      }),
    ).toThrow(/provider_misconfigured/);
  });
});

describe("Jitsi host probe is a diagnostic", () => {
  it("does not treat HTTP 401, 403, item-not-found, or policy-violation as JWT proof", async () => {
    const cases = [
      { status: 401, body: "<failure><not-authorized/></failure>" },
      { status: 403, body: "forbidden" },
      { status: 200, body: "<failure><item-not-found/></failure>" },
      { status: 200, body: "<failure><policy-violation/></failure>" },
    ];

    for (const bosh of cases) {
      const probe = await probeJitsiHost(
        "https://meet.clinic.example",
        "meet.clinic.example",
        hostProbeFetch(bosh),
      );
      expect(probe.reachable, `reachable for ${bosh.status} ${bosh.body}`).toBe(true);
      expect(probe).not.toHaveProperty("verified");
      expect(probe.reasons.some((reason) => /not proof of JWT enforcement/i.test(reason))).toBe(
        true,
      );
      expect(probe.reasons).toContain(JITSI_PROBE_NOT_ATTESTATION);
    }
  });

  it("records anonymousdomain and an opened BOSH session as diagnostics only", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/external_api.js")) {
        return new Response("function JitsiMeetExternalAPI(){}", { status: 200 });
      }
      if (url.endsWith("/config.js")) {
        return new Response("var config = { anonymousdomain: 'guest.meet.test' };", { status: 200 });
      }
      if (url.endsWith("/http-bind") && init?.method === "POST") {
        return new Response("<body sid='abc123' xmlns='http://jabber.org/protocol/httpbind'></body>", {
          status: 200,
        });
      }
      return new Response("missing", { status: 404 });
    }) as unknown as typeof fetch;

    const probe = await probeJitsiHost(
      "https://meet.clinic.example",
      "meet.clinic.example",
      fetchImpl,
    );
    expect(probe.reachable).toBe(true);
    expect(probe.reasons.some((reason) => reason.includes("anonymousdomain"))).toBe(true);
    expect(probe.reasons.some((reason) => reason.includes("opened a session"))).toBe(true);
    expect(probe.reasons).toContain(JITSI_PROBE_NOT_ATTESTATION);
  });
});

describe("meeting entry operator flag", () => {
  it("does not enable entry from configuration or probe success alone", async () => {
    setPrivateJitsiConfig();
    const probe = await probeJitsiHost(
      "https://meet.clinic.example",
      "meet.clinic.example",
      hostProbeFetch({ status: 401, body: "<failure><not-authorized/></failure>" }),
    );
    expect(probe.reachable).toBe(true);
    expect(meetingProviderSetup().secure).toBe(true);

    const readiness = resolveMeetingProviderReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.operatorVerified).toBe(false);
    expect(readiness.blockers).toContain(JITSI_OPERATOR_VERIFIED_REQUIREMENT);
    expect(canEnterPrivateConsultationMeeting()).toBe(false);
    expect(() =>
      buildMeetingJoinSession("sec-room-key", {
        userId: "user-1",
        displayName: "Ada",
        moderator: true,
      }),
    ).toThrow(/provider_misconfigured/);
  });

  it("does not enable entry when the operator flag is set without private JWT configuration", () => {
    process.env.JITSI_OPERATOR_VERIFIED = "YES";
    const readiness = resolveMeetingProviderReadiness();
    expect(readiness.operatorVerified).toBe(true);
    expect(readiness.setup.secure).toBe(false);
    expect(readiness.ready).toBe(false);
    expect(canEnterPrivateConsultationMeeting()).toBe(false);
    expect(readiness.blockers.some((item) => item.includes("JITSI_DOMAIN"))).toBe(true);
  });

  it("does not treat a truthy non-YES operator flag as verification", () => {
    setPrivateJitsiConfig();
    process.env.JITSI_OPERATOR_VERIFIED = "true";
    expect(resolveMeetingProviderReadiness().ready).toBe(false);
    expect(canEnterPrivateConsultationMeeting()).toBe(false);
  });

  it("enables entry only when configuration and JITSI_OPERATOR_VERIFIED=YES are both set", () => {
    setPrivateJitsiConfig();
    process.env.JITSI_OPERATOR_VERIFIED = "YES";
    const readiness = resolveMeetingProviderReadiness();
    expect(readiness.ready).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(canEnterPrivateConsultationMeeting()).toBe(true);
    const session = buildMeetingJoinSession("sec-room-key", {
      userId: "user-1",
      displayName: "Ada",
      moderator: true,
    });
    expect(session.jwt).toBeTruthy();
    expect(decodeJwtPayload(session.jwt).room).toBe("sec-room-key");
  });
});
