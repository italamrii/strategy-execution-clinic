import { svgToPng } from "@/modules/credentials";
import {
  renderAchievementCardSvg,
  SOCIAL_CARD_SIZES,
  type AchievementCardInput,
  type SocialCardVariant,
} from "./social-card";

export async function renderAchievementPng(
  input: AchievementCardInput,
  variant: SocialCardVariant,
): Promise<Buffer> {
  const svg = renderAchievementCardSvg(input, variant);
  const [w, h] = SOCIAL_CARD_SIZES[variant];
  return svgToPng(svg, w, h);
}

export function safeShareFilename(kind: string, publicCode: string, variant: string): string {
  const safe = publicCode.replace(/[^A-Z0-9-]/gi, "").slice(0, 48);
  return `clinic-${kind}-${safe}-${variant}.png`;
}
