import { describe, expect, it } from "vitest";
import { meetingEmbedUrl } from "./service";

describe("meeting embed security", () => {
  it("uses https Jitsi rooms and disables recordings", () => {
    const url = meetingEmbedUrl("sec-room-key");
    expect(url.startsWith("https://")).toBe(true);
    expect(url).toContain("config.fileRecordingsEnabled=false");
    expect(url).toContain("config.liveStreamingEnabled=false");
    expect(url).not.toContain("@");
    expect(url).not.toContain("email=");
  });
});
