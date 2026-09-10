export const SUPPORT_CATEGORIES = [
  "general",
  "membership",
  "consultation",
  "privacy",
  "technical",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
