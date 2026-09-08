import { describe, expect, it } from "vitest";
import sharp from "sharp";
import jsQR from "jsqr";
import { generateQrPngBuffer } from "@/modules/credentials";
import { existsSync } from "node:fs";
import { renderRecognitionCertificatePdf, ARABIC_PDF_FONT_PATH } from "./certificate-pdf";
import { prepareArabicPdfText } from "./arabic-pdf-text";
import { renderAchievementPng, safeShareFilename } from "./social-export";

describe("recognition exports", () => {
  it("renders PNG social cards with expected MIME-ready size", async () => {
    const png = await renderAchievementPng(
      {
        locale: "en",
        title: "Distinguished Volunteer",
        subtitle: "Verified Clinic recognition",
        publicCode: "SEC-BDG-2026-ABCDEF",
        metricLabel: "Approved hours",
        metricValue: "100",
        qrSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
      },
      "square",
    );
    expect(png.byteLength).toBeGreaterThan(2000);
    expect(safeShareFilename("badge", "SEC-BDG-2026-ABCDEF", "square")).toBe(
      "clinic-badge-SEC-BDG-2026-ABCDEF-square.png",
    );
  });

  it("renders a certificate PDF containing the public code", async () => {
    const url = "http://localhost:3000/ar/certificate/SEC-CRT-2026-ABCDEF";
    const pdf = await renderRecognitionCertificatePdf({
      locale: "ar",
      recipientName: "عبدالله العمري",
      title: "شهادة مساهمة معتمدة",
      wording:
        "تشهد عيادة الاستراتيجية والتنفيذ بأن المستفيد قد حقق متطلبات الإنجاز وفق السجل المعتمد لدى العيادة.",
      publicCode: "SEC-CRT-2026-ABCDEF",
      issuedYear: 2026,
      verificationUrl: url,
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(800);
    const payload = pdf.toString("latin1");
    expect(payload).toMatch(/NotoSansArabic/i);
    expect(payload).not.toMatch(/\/BaseFont\/Helvetica\b/);
    expect(payload).toMatch(/0053.*0045.*0043|SEC-CRT-2026-ABCDEF/);
    expect(payload).not.toContain("email");
  });

  it("uses the licensed Arabic font file for certificate PDFs", () => {
    expect(existsSync(ARABIC_PDF_FONT_PATH)).toBe(true);
  });
  it("shapes Arabic certificate text for PDF rendering", () => {
    const shaped = prepareArabicPdfText("عيادة الاستراتيجية والتنفيذ");
    expect(shaped).not.toBe("عيادة الاستراتيجية والتنفيذ");
    expect(shaped.length).toBeGreaterThan(0);
  });

  it("QR for certificate verification decodes", async () => {
    const url = "http://localhost:3000/en/certificate/SEC-CRT-2026-ABCDEF";
    const png = await generateQrPngBuffer(url, 256);
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    expect(decoded?.data).toBe(url);
  });
});
