"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

type Theme = "light" | "dark";

function persistTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("clinic-theme", theme);
    document.cookie = `clinic-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // Ignore storage failures; the in-document attribute still applies.
  }
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("storage", onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const t = useTranslations("theme");
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light");

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === "dark" ? t("useLight") : t("useDark")}
      onClick={() => persistTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? t("light") : t("dark")}
    </button>
  );
}
