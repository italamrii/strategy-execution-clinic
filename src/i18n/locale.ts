import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./routing";

export function requireLocale(value: string): Locale {
  if (!isLocale(value)) {
    notFound();
  }
  return value;
}
