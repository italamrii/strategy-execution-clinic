import { escapeXml } from "@/modules/credentials";

export const SOCIAL_CARD_DESIGN_VERSION = "SOCIAL_CARD_V1";

export const SOCIAL_CARD_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  landscape: [1200, 628],
} as const;

export type SocialCardVariant = keyof typeof SOCIAL_CARD_SIZES;

export type AchievementCardInput = {
  locale: "ar" | "en";
  title: string;
  subtitle: string;
  publicCode: string;
  metricLabel?: string;
  metricValue?: string;
  qrSvg: string;
};

export function shareCaptions(input: {
  locale: "ar" | "en";
  title: string;
  publicCode: string;
  verificationUrl: string;
}): { caption: string; linkedInShareUrl: string } {
  const caption =
    input.locale === "ar"
      ? `${input.title} — عيادة الاستراتيجية والتنفيذ. رمز التحقق: ${input.publicCode} ${input.verificationUrl}`
      : `${input.title} — Strategy & Execution Clinic. Verification: ${input.publicCode} ${input.verificationUrl}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(input.verificationUrl)}`;
  return { caption, linkedInShareUrl };
}

export function renderAchievementCardSvg(
  input: AchievementCardInput,
  variant: SocialCardVariant,
): string {
  const [width, height] = SOCIAL_CARD_SIZES[variant];
  const dir = input.locale === "ar" ? "rtl" : "ltr";
  const title = escapeXml(input.title);
  const subtitle = escapeXml(input.subtitle);
  const code = escapeXml(input.publicCode);
  const metric =
    input.metricLabel && input.metricValue
      ? `<text x="${width / 2}" y="${height * 0.62}" text-anchor="middle" fill="#A68654" font-size="42" font-family="Georgia, serif">${escapeXml(input.metricValue)}</text>
         <text x="${width / 2}" y="${height * 0.67}" text-anchor="middle" fill="#4B5563" font-size="22" font-family="Georgia, serif">${escapeXml(input.metricLabel)}</text>`
      : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" direction="${dir}">
  <rect width="100%" height="100%" fill="#F7F4EE"/>
  <rect x="48" y="48" width="${width - 96}" height="${height - 96}" fill="none" stroke="#152238" stroke-width="3"/>
  <rect x="64" y="64" width="${width - 128}" height="8" fill="#A68654"/>
  <text x="${width / 2}" y="${height * 0.18}" text-anchor="middle" fill="#A68654" font-size="20" letter-spacing="4" font-family="Georgia, serif">STRATEGY &amp; EXECUTION CLINIC</text>
  <text x="${width / 2}" y="${height * 0.32}" text-anchor="middle" fill="#152238" font-size="48" font-family="Georgia, serif">${title}</text>
  <text x="${width / 2}" y="${height * 0.42}" text-anchor="middle" fill="#4B5563" font-size="24" font-family="Georgia, serif">${subtitle}</text>
  ${metric}
  <g transform="translate(${width / 2 - 90}, ${height - 280})">${input.qrSvg}</g>
  <text x="${width / 2}" y="${height - 80}" text-anchor="middle" fill="#152238" font-size="20" font-family="ui-monospace, monospace">${code}</text>
</svg>`;
}
