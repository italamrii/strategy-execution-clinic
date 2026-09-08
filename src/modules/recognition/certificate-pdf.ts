import PDFDocument from "pdfkit";
import { generateQrPngBuffer } from "@/modules/credentials";
import {
  ARABIC_PDF_FONT_PATH,
  preparePdfText,
} from "./arabic-pdf-text";

export type CertificatePdfInput = {
  locale: "ar" | "en";
  recipientName: string;
  title: string;
  wording: string;
  publicCode: string;
  issuedYear: number;
  verificationUrl: string;
};

function escapeSafe(text: string): string {
  return text.replace(/[<>]/g, "");
}

export async function renderRecognitionCertificatePdf(
  input: CertificatePdfInput,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 48,
    compress: false,
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const isAr = input.locale === "ar";
  if (isAr) {
    doc.registerFont("NotoSansArabic", ARABIC_PDF_FONT_PATH);
    doc.font("NotoSansArabic");
  } else {
    doc.font("Helvetica");
  }

  const t = (value: string) => preparePdfText(input.locale, escapeSafe(value));

  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).stroke("#152238");
  doc.rect(36, 36, doc.page.width - 72, 6).fill("#A68654");
  doc
    .fontSize(14)
    .fillColor("#A68654")
    .text(
      t(isAr ? "عيادة الاستراتيجية والتنفيذ" : "Strategy & Execution Clinic"),
      60,
      60,
      { align: "center" },
    );
  doc
    .fontSize(26)
    .fillColor("#152238")
    .text(t(input.title), 60, 120, { align: "center", width: doc.page.width - 120 });
  doc
    .fontSize(20)
    .fillColor("#152238")
    .text(t(input.recipientName), 60, 190, {
      align: "center",
      width: doc.page.width - 120,
    });
  doc
    .fontSize(12)
    .fillColor("#4B5563")
    .text(t(input.wording), 80, 250, {
      align: "center",
      width: doc.page.width - 160,
    });
  doc
    .fontSize(11)
    .fillColor("#A68654")
    .text(
      isAr
        ? `${t("رقم التحقق")}: ${input.publicCode}`
        : `Verification: ${input.publicCode}`,
      60,
      340,
      { align: "center" },
    );
  const qr = await generateQrPngBuffer(input.verificationUrl, 160);
  doc.image(qr, doc.page.width / 2 - 50, 380, { width: 100, height: 100 });
  doc
    .fontSize(9)
    .fillColor("#6B7280")
    .text(
      t(
        isAr
          ? "هذه الشهادة صادرة عن العيادة وفق سجلها المعتمد. ليست اعتماداً حكومياً ولا رخصة مهنية."
          : "Clinic-issued record. Not a government accreditation or professional license.",
      ),
      60,
      doc.page.height - 70,
      { align: "center", width: doc.page.width - 120 },
    );
  doc
    .fontSize(10)
    .fillColor("#6B7280")
    .text(String(input.issuedYear), 60, doc.page.height - 48, { align: "center" });

  doc.end();
  return done;
}

export { ARABIC_PDF_FONT_PATH } from "./arabic-pdf-text";
