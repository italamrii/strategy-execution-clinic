import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  localePrefix: "always",
  localeDetection: false,
});

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
