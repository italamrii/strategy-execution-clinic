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
  issuedAtLabel?: string;
  typeSlug: string;
  qrSvg: string;
  showPhoto: boolean;
  photoDataUrl?: string | null;
  design?: CardDesign | null;
};

export type CardDesign = {
  background?: string;
  surface?: string;
  accent?: string;
  text?: string;
  muted?: string;
  showSeal?: boolean;
  showMemberSince?: boolean;
  showBenefits?: boolean;
  frontTaglineAr?: string;
  frontTaglineEn?: string;
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
  const design = input.design ?? {};
  const background = design.background ?? "#071526";
  const surface = design.surface ?? "#0B1D33";
  const accent = design.accent ?? "#C9A45F";
  const text = design.text ?? "#F7F3EA";
  const muted = design.muted ?? "#C6B994";
  const isAr = input.locale === "ar";
  const clinic = isAr ? "عيادة الاستراتيجية والتنفيذ" : "Strategy & Execution Clinic";
  const clinicSub = isAr ? "Strategy & Execution Clinic" : "عيادة الاستراتيجية والتنفيذ";
  const typeName = isAr ? input.membershipTypeAr : input.membershipTypeEn;
  const track =
    (isAr ? input.primaryTrackAr : input.primaryTrackEn) ??
    (isAr ? input.primaryTrackEn : input.primaryTrackAr) ??
    "";
  const dir = isAr ? "rtl" : "ltr";
  const tagline = isAr
    ? design.frontTaglineAr ?? "من التشخيص... إلى التنفيذ... إلى الأثر"
    : design.frontTaglineEn ?? "From diagnosis to execution to impact";

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
  <rect width="100%" height="100%" fill="${background}"/>
  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="42" fill="${surface}" stroke="${accent}" stroke-width="4"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <path d="M70 70 H520" stroke="${accent}" stroke-width="3" opacity=".75"/>
  <text x="${isAr ? width - 90 : 90}" y="110" fill="${text}" font-family="Noto Sans Arabic, IBM Plex Sans Arabic, sans-serif" font-size="34" font-weight="700" text-anchor="${isAr ? "end" : "start"}">${escapeXml(clinic)}</text>
  <text x="${isAr ? width - 90 : 90}" y="152" fill="${muted}" font-family="IBM Plex Sans, sans-serif" font-size="20" text-anchor="${isAr ? "end" : "start"}">${escapeXml(clinicSub)}</text>
  ${
    family.engraving
      ? `<text x="${width / 2}" y="220" fill="${family.accent}" opacity="0.35" font-family="IBM Plex Sans, sans-serif" font-size="18" letter-spacing="6" text-anchor="middle">${escapeXml(family.engraving)}</text>`
      : ""
  }
  <text x="${width / 2}" y="245" fill="${accent}" font-family="IBM Plex Sans, sans-serif" font-size="22" letter-spacing="7" text-anchor="middle">PROFESSIONAL</text>
  <text x="${width / 2}" y="330" fill="${accent}" font-family="IBM Plex Sans, sans-serif" font-size="62" font-weight="700" letter-spacing="8" text-anchor="middle">${escapeXml(typeName.toUpperCase())}</text>
  <text x="${width / 2}" y="385" fill="${muted}" font-family="Noto Sans Arabic, sans-serif" font-size="24" text-anchor="middle">${escapeXml(tagline)}</text>
  <text x="${isAr ? width - 160 : 160}" y="565" fill="${text}" font-family="Noto Sans Arabic, IBM Plex Sans, sans-serif" font-size="48" font-weight="600" text-anchor="${isAr ? "end" : "start"}">${escapeXml(input.memberName)}</text>
  ${
    track
      ? `<text x="${isAr ? width - 160 : 160}" y="630" fill="${muted}" font-family="Noto Sans Arabic, IBM Plex Sans, sans-serif" font-size="25" text-anchor="${isAr ? "end" : "start"}">${escapeXml(track)}</text>`
      : ""
  }
  <line x1="150" y1="690" x2="${width - 150}" y2="690" stroke="${accent}" opacity=".45"/>
  <text x="${isAr ? width - 160 : 160}" y="750" fill="${muted}" font-family="Noto Sans Arabic, sans-serif" font-size="22" text-anchor="${isAr ? "end" : "start"}">${isAr ? "رقم العضوية" : "Member ID"}</text>
  <text x="${isAr ? width - 500 : 500}" y="750" fill="${text}" font-family="IBM Plex Sans, monospace" font-size="27" text-anchor="${isAr ? "end" : "start"}">${escapeXml(input.publicCode)}</text>
  ${design.showMemberSince === false ? "" : `<text x="${isAr ? width - 160 : 160}" y="815" fill="${muted}" font-family="Noto Sans Arabic, sans-serif" font-size="22" text-anchor="${isAr ? "end" : "start"}">${isAr ? "تاريخ الانضمام" : "Member since"}</text><text x="${isAr ? width - 500 : 500}" y="815" fill="${text}" font-family="IBM Plex Sans, sans-serif" font-size="25" text-anchor="${isAr ? "end" : "start"}">${escapeXml(input.issuedAtLabel ?? String(input.issuedYear))}</text>`}
  <g transform="translate(${width - 360}, 610) scale(.78)">${input.qrSvg.replace(/<\?xml[^>]*>/, "").trim()}</g>
  ${design.showSeal === false ? "" : `<circle cx="${width - 235}" cy="430" r="92" fill="none" stroke="${accent}" stroke-width="5"/><circle cx="${width - 235}" cy="430" r="70" fill="none" stroke="${accent}" stroke-width="2"/><text x="${width - 235}" y="422" fill="${accent}" font-size="45" text-anchor="middle">✓</text><text x="${width - 235}" y="466" fill="${accent}" font-family="IBM Plex Sans" font-size="17" text-anchor="middle">APPROVED MEMBER</text>`}
  <text x="80" y="${height - 65}" fill="${muted}" font-family="IBM Plex Sans Arabic, sans-serif" font-size="18">${escapeXml(input.statusLabel)} · ${input.issuedYear}</text>
</svg>`;
}

export function renderCardBackSvg(input: CardRenderInput, width = 1600, height = 1000): string {
  const isAr = input.locale === "ar";
  const design = input.design ?? {};
  const background = design.background ?? "#071526";
  const surface = design.surface ?? "#0B1D33";
  const accent = design.accent ?? "#C9A45F";
  const text = design.text ?? "#F7F3EA";
  const muted = design.muted ?? "#C6B994";
  const domain = "strategyexecution.clinic";
  const charter = isAr
    ? "أتعهد بأن أكون عضوًا فاعلًا في مجتمع عيادة الاستراتيجية والتنفيذ، وأن أشارك المعرفة، وأحترم أخلاقيات المهنة، وأسهم في تطوير الجهات وتحقيق أثر مؤسسي مستدام."
    : "I commit to active participation, responsible knowledge sharing, professional ethics, and sustainable institutional impact.";
  const benefits = isAr ? "مجتمع مهني · لقاءات ونقاشات · مكتبة معرفية · شهادة عضوية · أولوية في المبادرات · فرص تطوعية" : "Professional community · Sessions · Knowledge library · Certificate · Initiative priority · Volunteering";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${background}"/>
  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="42" fill="${surface}" stroke="${accent}" stroke-width="4"/>
  <text x="${width / 2}" y="150" fill="${accent}" font-family="Noto Sans Arabic, IBM Plex Sans" font-size="38" font-weight="700" text-anchor="middle">${isAr ? "ميثاق عضو العيادة" : "Clinic Member Charter"}</text>
  <line x1="350" y1="185" x2="${width - 350}" y2="185" stroke="${accent}" opacity=".65"/>
  <foreignObject x="200" y="230" width="1200" height="210"><div xmlns="http://www.w3.org/1999/xhtml" dir="${isAr ? "rtl" : "ltr"}" style="color:${text};font-family:'Noto Sans Arabic',sans-serif;font-size:29px;line-height:1.8;text-align:center">${escapeXml(charter)}</div></foreignObject>
  ${design.showBenefits === false ? "" : `<text x="${width / 2}" y="560" fill="${accent}" font-family="Noto Sans Arabic, IBM Plex Sans" font-size="34" font-weight="700" text-anchor="middle">${isAr ? "مزايا العضوية" : "Membership Benefits"}</text><foreignObject x="160" y="600" width="1280" height="130"><div xmlns="http://www.w3.org/1999/xhtml" dir="${isAr ? "rtl" : "ltr"}" style="color:${muted};font-family:'Noto Sans Arabic',sans-serif;font-size:24px;line-height:1.8;text-align:center">${escapeXml(benefits)}</div></foreignObject>`}
  <line x1="120" y1="790" x2="${width - 120}" y2="790" stroke="${accent}" opacity=".35"/>
  <text x="${width / 2}" y="855" fill="${muted}" font-family="IBM Plex Sans" font-size="22" text-anchor="middle">${escapeXml(domain)} · ${escapeXml(input.publicCode)}</text>
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
