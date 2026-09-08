import path from "node:path";
import { ArabicShaper } from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";

const bidi = bidiFactory();

export const ARABIC_PDF_FONT_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@expo-google-fonts",
  "noto-sans-arabic",
  "400Regular",
  "NotoSansArabic_400Regular.ttf",
);

export function prepareArabicPdfText(text: string): string {
  const reshaped = ArabicShaper.convertArabic(text);
  const embedding = bidi.getEmbeddingLevels(reshaped, "rtl");
  const chars = [...reshaped];
  const flips = bidi.getReorderSegments(reshaped, embedding);
  for (const [start, end] of flips) {
    const slice = chars.slice(start, end + 1).reverse();
    for (let i = start; i <= end; i++) {
      chars[i] = slice[i - start]!;
    }
  }
  return chars.join("");
}

export function preparePdfText(locale: "ar" | "en", text: string): string {
  return locale === "ar" ? prepareArabicPdfText(text) : text;
}
