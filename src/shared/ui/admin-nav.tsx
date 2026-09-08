"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const LINKS = [
  { key: "overview", href: "/admin" },
  { key: "memberships", href: "/admin/memberships" },
  { key: "credentials", href: "/admin/credentials" },
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
    <nav className="mt-6 flex flex-wrap gap-3 text-sm">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          className={
            active === link.key
              ? "border-b border-gold text-navy"
              : "text-graphite hover:text-navy"
          }
        >
          {t(link.key)}
        </Link>
      ))}
    </nav>
  );
}
