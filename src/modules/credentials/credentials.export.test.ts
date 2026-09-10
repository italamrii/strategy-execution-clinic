import { describe, expect, it } from "vitest";
import sharp from "sharp";
import jsQR from "jsqr";
import { generateQrPngBuffer, buildVerificationUrl } from "./qr";
import { renderCardPng } from "./export";

describe("credential exports", () => {
  it("generates a QR that decodes to the verification URL", async () => {
    const code = "SEC-PRO-2026-ABCDEF";
    const url = buildVerificationUrl(code, "ar");
    const png = await generateQrPngBuffer(url, 256);
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    expect(decoded?.data).toBe(url);
  });

  it("renders a non-empty membership card PNG", async () => {
    const png = await renderCardPng({
      locale: "en",
      memberName: "Abdullah Alamri",
      membershipTypeAr: "عضو مهني",
      membershipTypeEn: "Professional Member",
      primaryTrackAr: "الاستراتيجية",
      primaryTrackEn: "Strategy",
      publicCode: "SEC-PRO-2026-ABCDEF",
      statusLabel: "Active",
      issuedYear: 2026,
      issuedAtLabel: "10 Sep 2026",
      expiresAtLabel: "10 Sep 2027",
      typeSlug: "professional_member",
      qrSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
      showPhoto: false,
      photoDataUrl: null,
    });
    expect(png.byteLength).toBeGreaterThan(1000);
  });
});
