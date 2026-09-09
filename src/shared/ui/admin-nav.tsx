"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const LINKS = [
  { key: "overview", href: "/admin" },
  { key: "memberships", href: "/admin/memberships" },
  { key: "tracks", href: "/admin/tracks" },
  { key: "credentials", href: "/admin/credentials" },
  { key: "cardTemplates", href: "/admin/card-templates" },
  { key: "consultations", href: "/admin/consultations" },
  { key: "meetings", href: "/admin/meetings" },
  { key: "volunteers", href: "/admin/volunteers" },
  { key: "contributions", href: "/admin/contributions" },
  { key: "recognition", href: "/admin/recognition" },
  { key: "content", href: "/admin/content" },
  { key: "announcements", href: "/admin/announcements" },
  { key: "audit", href: "/admin/audit" },
  { key: "security", href: "/admin/security" },
  { key: "settings", href: "/admin/settings" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({
  active,
}: {
  active?: (typeof LINKS)[number]["key"];
}) {
  const t = useTranslations("adminNav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="admin-shell__nav">
      {LINKS.map((link) => {
        const current = active ? active === link.key : isActive(pathname, link.href);
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={current ? "is-active" : undefined}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
