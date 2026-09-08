import { createHash } from "node:crypto";
import type { Locale } from "@/i18n/routing";
import {
  renderCardBackSvg,
  renderCardFrontSvg,
  renderLinkedInLandscapeSvg,
  renderLinkedInPortraitSvg,
  renderLinkedInSquareSvg,
  type CardRenderInput,
} from "./card-svg";

export function hashContent(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function svgToPng(svg: string, width: number, height: number): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}

export async function renderCardPng(input: CardRenderInput): Promise<Buffer> {
  const front = renderCardFrontSvg(input);
  return svgToPng(front, 1600, 1000);
}

export async function renderLinkedInPng(
  input: CardRenderInput,
  variant: "square" | "portrait" | "landscape",
): Promise<Buffer> {
  const svg =
    variant === "square"
      ? renderLinkedInSquareSvg(input)
      : variant === "portrait"
        ? renderLinkedInPortraitSvg(input)
        : renderLinkedInLandscapeSvg(input);
  const sizes = {
    square: [1080, 1080],
    portrait: [1080, 1350],
    landscape: [1200, 628],
  } as const;
  const [w, h] = sizes[variant];
  return svgToPng(svg, w, h);
}

export async function renderCertificatePdf(
  input: CardRenderInput & { issuedAtLabel: string; verificationUrl: string },
  locale: Locale,
): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const isAr = locale === "ar";
  const doc = new PDFDocument({ size: "A4", margin: 56 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk as Buffer));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(22).fillColor("#152238").text(
    isAr ? "شهادة عضوية — عيادة الاستراتيجية والتنفيذ" : "Membership Certificate — Strategy & Execution Clinic",
    { align: "center" },
  );
  doc.moveDown();
  doc.fontSize(14).fillColor("#4B5563").text(
    isAr
      ? `تشهد عيادة الاستراتيجية والتنفيذ بأن ${input.memberName} يحمل عضوية ${input.membershipTypeAr}.`
      : `Strategy & Execution Clinic certifies that ${input.memberName} holds ${input.membershipTypeEn} membership.`,
    { align: "center" },
  );
  if (input.primaryTrackAr || input.primaryTrackEn) {
    const track = isAr ? input.primaryTrackAr : input.primaryTrackEn;
    doc.text(isAr ? `ضمن مسار ${track}` : `within the ${track} track.`, { align: "center" });
  }
  doc.moveDown();
  doc.fontSize(12).text(`${isAr ? "رمز العضوية" : "Membership code"}: ${input.publicCode}`, { align: "center" });
  doc.text(`${isAr ? "تاريخ الإصدار" : "Issued"}: ${input.issuedAtLabel}`, { align: "center" });
  doc.text(`${isAr ? "الحالة" : "Status"}: ${input.statusLabel}`, { align: "center" });
  doc.moveDown();
  doc.text(`${isAr ? "رابط التحقق" : "Verification"}: ${input.verificationUrl}`, { align: "center" });

  const qrPng = await import("./qr").then((m) =>
    m.generateQrPngBuffer(input.verificationUrl, 220),
  );
  const x = (doc.page.width - 220) / 2;
  doc.image(qrPng, x, doc.y + 12, { width: 220, height: 220 });
  doc.end();
  return done;
}

export async function renderCardSheetPdf(input: CardRenderInput): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const frontPng = await renderCardPng(input);
  const backSvg = renderCardBackSvg(input);
  const backPng = await svgToPng(backSvg, 1600, 1000);
  const doc = new PDFDocument({ size: [1600, 1000], margin: 0, autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk as Buffer));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  doc.addPage();
  doc.image(frontPng, 0, 0, { width: 1600, height: 1000 });
  doc.addPage();
  doc.image(backPng, 0, 0, { width: 1600, height: 1000 });
  doc.end();
  return done;
}
