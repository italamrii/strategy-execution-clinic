import { afterEach, describe, expect, it } from "vitest";
import { signJitsiJwt } from "./jitsi-jwt";
import {
  canEnterPrivateConsultationMeeting,
  meetingProviderSetup,
} from "./provider";
import { meetingEmbedUrl } from "./service";

function clearJitsiEnv() {
  delete process.env.JITSI_DOMAIN;
  delete process.env.JITSI_JWT_APP_ID;
  delete process.env.JITSI_JWT_SECRET;
  delete process.env.JITSI_JWT_ISSUER;
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

  it("is secure only with a private HTTPS host and JWT credentials", () => {
    process.env.JITSI_DOMAIN = "https://meet.clinic.example";
    process.env.JITSI_JWT_APP_ID = "clinic";
    process.env.JITSI_JWT_SECRET = "super-secret";
    const setup = meetingProviderSetup();
    expect(setup.secure).toBe(true);
    expect(setup.host).toBe("meet.clinic.example");
    expect(canEnterPrivateConsultationMeeting()).toBe(true);
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

describe("meeting embed security", () => {
  it("does not emit a public Jitsi URL when the provider is not configured", () => {
    expect(() => meetingEmbedUrl("sec-room-key")).toThrow(/provider_misconfigured/);
  });

  it("issues a room-scoped JWT on a private host and never uses meet.jit.si", () => {
    process.env.JITSI_DOMAIN = "https://meet.clinic.example";
    process.env.JITSI_JWT_APP_ID = "clinic";
    process.env.JITSI_JWT_SECRET = "super-secret";
    const url = meetingEmbedUrl("sec-room-key", {
      userId: "user-1",
      displayName: "Ada",
      moderator: true,
    });
    expect(url.startsWith("https://meet.clinic.example/sec-room-key#")).toBe(true);
    expect(url).not.toContain("meet.jit.si");
    expect(url).toContain("jwt=");
    expect(url).toContain("config.fileRecordingsEnabled=false");
    expect(url).toContain("config.liveStreamingEnabled=false");
    expect(url).not.toContain("@");
    expect(url).not.toContain("email=");
    const jwt = new URLSearchParams(url.split("#")[1]).get("jwt");
    expect(jwt).toBeTruthy();
    const payload = decodeJwtPayload(jwt!);
    expect(payload.room).toBe("sec-room-key");
    expect(payload.sub).toBe("meet.clinic.example");
    expect(payload.aud).toBe("clinic");
    expect(payload.context.user.id).toBe("user-1");
  });
});
