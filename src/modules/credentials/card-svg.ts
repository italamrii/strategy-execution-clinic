import type { Locale } from "@/i18n/routing";
import { escapeXml } from "./escape";

export type CardRenderInput = {
  locale: Locale;
  memberName: string;
  membershipTypeAr: string;
  membershipTypeEn: string;
  primaryTrackAr: string | null;
  primaryTrackEn: string | null;
  publicCode: string;
  statusLabel: string;
  issuedYear: number;
  typeSlug: string;
  qrSvg: string;
  showPhoto: boolean;
  photoDataUrl?: string | null;
};

type CardFamily = {
  border: string;
  accent: string;
  engraving?: string;
  patternOpacity: number;
};

const FAMILIES: Record<string, CardFamily> = {
  founding_member: {
    border: "#A68654",
    accent: "#C4A574",
    engraving: "FOUNDING MEMBER",
    patternOpacity: 0.08,
  },
  expert_member: {
    border: "#152238",
    accent: "#C4A574",
    patternOpacity: 0.05,
  },
  professional_member: {
    border: "#D4CDBF",
    accent: "#152238",
    patternOpacity: 0.04,
  },
  contributor: {
    border: "#D4CDBF",
    accent: "#4B5563",
    patternOpacity: 0.05,
  },
  volunteer_member: {
    border: "#A68654",
    accent: "#152238",
    engraving: "VOLUNTEER",
    patternOpacity: 0.07,
  },
  volunteer_leader: {
    border: "#152238",
    accent: "#C4A574",
    engraving: "LEADER",
    patternOpacity: 0.06,
  },
  distinguished_volunteer: {
    border: "#A68654",
    accent: "#152238",
    engraving: "DISTINGUISHED",
    patternOpacity: 0.07,
  },
  strategic_partner: {
    border: "#152238",
    accent: "#4B5563",
    patternOpacity: 0.04,
  },
  institutional_member: {
    border: "#152238",
    accent: "#6B7280",
    patternOpacity: 0.04,
  },
};

function familyForSlug(slug: string): CardFamily {
  return FAMILIES[slug] ?? FAMILIES.professional_member!;
}

export function renderCardFrontSvg(input: CardRenderInput, width = 1600, height = 1000): string {
  const family = familyForSlug(input.typeSlug);
  const isAr = input.locale === "ar";
  const clinic = isAr ? "عيادة الاستراتيجية والتنفيذ" : "Strategy & Execution Clinic";
  const clinicSub = isAr ? "Strategy & Execution Clinic" : "عيادة الاستراتيجية والتنفيذ";
  const typeName = isAr ? input.membershipTypeAr : input.membershipTypeEn;
  const track =
    (isAr ? input.primaryTrackAr : input.primaryTrackEn) ??
    (isAr ? input.primaryTrackEn : input.primaryTrackAr) ??
    "";
  const dir = isAr ? "rtl" : "ltr";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" direction="${dir}">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4BC8E"/>
      <stop offset="100%" stop-color="#A68654"/>
    </linearGradient>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${family.accent}" stroke-opacity="${family.patternOpacity}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="${family.border}" stroke-width="3" rx="18"/>
  <text x="${isAr ? width - 80 : 80}" y="110" fill="#152238" font-family="IBM Plex Sans Arabic, IBM Plex Sans, sans-serif" font-size="34" font-weight="600" text-anchor="${isAr ? "end" : "start"}">${escapeXml(clinic)}</text>
  <text x="${isAr ? width - 80 : 80}" y="150" fill="#6B7280" font-family="IBM Plex Sans, IBM Plex Sans Arabic, sans-serif" font-size="20" text-anchor="${isAr ? "end" : "start"}">${escapeXml(clinicSub)}</text>
  ${
    family.engraving
      ? `<text x="${width / 2}" y="220" fill="${family.accent}" opacity="0.35" font-family="IBM Plex Sans, sans-serif" font-size="18" letter-spacing="6" text-anchor="middle">${escapeXml(family.engraving)}</text>`
      : ""
  }
  <text x="${width / 2}" y="420" fill="#152238" font-family="IBM Plex Sans Arabic, IBM Plex Sans, sans-serif" font-size="64" font-weight="600" text-anchor="middle">${escapeXml(input.memberName)}</text>
  <text x="${width / 2}" y="500" fill="#4B5563" font-family="IBM Plex Sans Arabic, IBM Plex Sans, sans-serif" font-size="30" text-anchor="middle">${escapeXml(typeName)}</text>
  ${
    track
      ? `<text x="${width / 2}" y="560" fill="#6B7280" font-family="IBM Plex Sans Arabic, IBM Plex Sans, sans-serif" font-size="24" text-anchor="middle">${escapeXml(track)}</text>`
      : ""
  }
  <text x="${width / 2}" y="700" fill="#A68654" font-family="IBM Plex Sans, monospace" font-size="28" letter-spacing="2" text-anchor="middle">${escapeXml(input.publicCode)}</text>
  <text x="${width / 2}" y="760" fill="#2F6F4E" font-family="IBM Plex Sans Arabic, IBM Plex Sans, sans-serif" font-size="22" text-anchor="middle">${escapeXml(input.statusLabel)}</text>
  <text x="${isAr ? 80 : width - 80}" y="${height - 60}" fill="#6B7280" font-family="IBM Plex Sans, sans-serif" font-size="18" text-anchor="${isAr ? "start" : "end"}">${input.issuedYear}</text>
</svg>`;
}

export function renderCardBackSvg(input: CardRenderInput, width = 1600, height = 1000): string {
  const isAr = input.locale === "ar";
  const scan = isAr ? "امسح للتحقق" : "Scan to verify";
  const domain = "strategyexecution.clinic";
  const qrInner = input.qrSvg.replace(/<\?xml[^>]*>/, "").trim();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#F7F5F1"/>
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="#FFFFFF" stroke="#D4CDBF" stroke-width="2" rx="18"/>
  <g transform="translate(${width / 2 - 180}, 220) scale(1.4)">${qrInner}</g>
  <text x="${width / 2}" y="780" fill="#152238" font-family="IBM Plex Sans Arabic, IBM Plex Sans, sans-serif" font-size="28" text-anchor="middle">${escapeXml(scan)}</text>
  <text x="${width / 2}" y="840" fill="#6B7280" font-family="IBM Plex Sans, sans-serif" font-size="22" text-anchor="middle">${escapeXml(domain)}</text>
  <text x="${width / 2}" y="900" fill="#6B7280" font-family="IBM Plex Sans, monospace" font-size="20" text-anchor="middle">${escapeXml(input.publicCode)}</text>
</svg>`;
}

export function renderLinkedInSquareSvg(input: CardRenderInput): string {
  return renderCardFrontSvg(input, 1080, 1080);
}

export function renderLinkedInPortraitSvg(input: CardRenderInput): string {
  return renderCardFrontSvg(input, 1080, 1350);
}

export function renderLinkedInLandscapeSvg(input: CardRenderInput): string {
  return renderCardFrontSvg(input, 1200, 628);
}
