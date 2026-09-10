"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const LINKS = [
  { key: "overview", href: "/admin", permission: "admin.dashboard.read" },
  { key: "memberships", href: "/admin/memberships", permission: "membership.read.any" },
  { key: "tracks", href: "/admin/tracks", permission: "track.manage" },
  { key: "credentials", href: "/admin/credentials", permission: "credential.read.any" },
  { key: "cardTemplates", href: "/admin/card-templates", permission: "card.template.manage" },
  { key: "consultations", href: "/admin/consultations", permission: "consultation.read.any" },
  { key: "meetings", href: "/admin/meetings", permission: "meeting.manage" },
  { key: "volunteers", href: "/admin/volunteers", permission: "volunteer.profile.read.any" },
  { key: "contributions", href: "/admin/contributions", permission: "contribution.read.any" },
  { key: "recognition", href: "/admin/recognition", permission: "badge.read.any" },
  { key: "content", href: "/admin/content", permission: "content.write" },
  { key: "support", href: "/admin/support", permission: "support.request.read.any" },
  { key: "announcements", href: "/admin/announcements", permission: "announcement.manage" },
  { key: "audit", href: "/admin/audit", permission: "audit.read" },
  { key: "security", href: "/admin/security", permission: "security.events.read" },
  { key: "settings", href: "/admin/settings", permission: "admin.settings.manage" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ permissions }: { permissions: readonly string[] }) {
  const t = useTranslations("adminNav");
  const pathname = usePathname();
  const visible = LINKS.filter((link) => {
    if (link.permission === "card.template.manage") {
      return permissions.includes("card.template.manage") || permissions.includes("credential.template.manage");
    }
    if (link.permission === "admin.settings.manage") {
      return permissions.includes("admin.settings.manage") || permissions.includes("settings.manage");
    }
    return permissions.includes(link.permission);
  });

  return (
    <nav aria-label={t("label")} className="admin-shell__nav">
      {visible.map((link) => {
        const current = isActive(pathname, link.href);
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
