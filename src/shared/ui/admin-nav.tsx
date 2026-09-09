"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const LINKS = [
  { key: "overview", href: "/admin" },
  { key: "memberships", href: "/admin/memberships" },
  { key: "tracks", href: "/admin/tracks" },
  { key: "credentials", href: "/admin/credentials" },
  { key: "cardTemplates", href: "/admin/card-templates" },
  { key: "consultations", href: "/admin/consultations" },
  { key: "volunteers", href: "/admin/volunteers" },
  { key: "contributions", href: "/admin/contributions" },
  { key: "recognition", href: "/admin/recognition" },
  { key: "content", href: "/admin/content" },
  { key: "announcements", href: "/admin/announcements" },
  { key: "audit", href: "/admin/audit" },
  { key: "security", href: "/admin/security" },
  { key: "settings", href: "/admin/settings" },
] as const;

export function AdminNav({ active }: { active: (typeof LINKS)[number]["key"] }) {
  const t = useTranslations("adminNav");
  return (
    <nav aria-label={t("overview")} className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-3 text-sm">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={active === link.key ? "page" : undefined}
          className={
            active === link.key
              ? "rounded-xl bg-navy px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-gold"
              : "rounded-xl px-4 py-3 text-graphite transition-colors hover:bg-gold/10 hover:text-navy focus-visible:outline-2 focus-visible:outline-gold"
          }
        >
          {t(link.key)}
        </Link>
      ))}
    </nav>
  );
}
