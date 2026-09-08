import QRCode from "qrcode";

export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#152238",
      light: "#FFFFFF",
    },
    width: 256,
  });
}

export async function generateQrPngBuffer(url: string, size = 512): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#152238",
      light: "#FFFFFF",
    },
    width: size,
  });
}

export function buildVerificationUrl(publicCode: string, locale: "ar" | "en"): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${locale}/verify/${encodeURIComponent(publicCode)}`;
}
