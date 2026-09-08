import { describe, expect, it } from "vitest";
import { generateRecognitionPublicCode, isValidRecognitionCode } from "./public-code";
import { renderAchievementCardSvg, shareCaptions } from "./social-card";

describe("recognition public codes", () => {
  it("is non-sequential and prefixed", () => {
    const code = generateRecognitionPublicCode({
      prefix: "BDG",
      year: 2026,
      entropy: Buffer.from("abcdefgh"),
    });
    expect(isValidRecognitionCode(code, "BDG")).toBe(true);
    expect(code.startsWith("SEC-BDG-2026-")).toBe(true);
  });
});

describe("public profile DTO", () => {
  it("does not leak private keys", () => {
    const serialized = JSON.stringify({
      displayNameAr: "عبدالله",
      contributions: [{ titleAr: "مقال", titleEn: "Article", kind: "article" }],
    });
    expect(serialized.includes('"email"')).toBe(false);
    expect(serialized.includes('"userId"')).toBe(false);
  });
});

describe("social cards", () => {
  it("includes public code and escapes markup", () => {
    const svg = renderAchievementCardSvg(
      {
        locale: "ar",
        title: "<script>x</script>",
        subtitle: "مساهمة معتمدة",
        publicCode: "SEC-BDG-2026-ABCDEF",
        qrSvg: "<svg></svg>",
      },
      "square",
    );
    expect(svg).toContain("SEC-BDG-2026-ABCDEF");
    expect(svg).not.toContain("<script>x</script>");
    expect(svg).toContain("&lt;script&gt;");
    const captions = shareCaptions({
      locale: "en",
      title: "Contributor",
      publicCode: "SEC-BDG-2026-ABCDEF",
      verificationUrl: "http://localhost:3000/en/badge/SEC-BDG-2026-ABCDEF",
    });
    expect(captions.linkedInShareUrl).toContain("linkedin.com/sharing/share-offsite");
  });
});
