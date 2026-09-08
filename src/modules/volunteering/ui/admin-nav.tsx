"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function VolunteerAdminNav({
  active,
}: {
  active: "volunteers" | "opportunities" | "applications" | "hours" | "progression";
}) {
  const t = useTranslations("adminVolunteer");
  const links = [
    { key: "volunteers", href: "/admin/volunteers" },
    { key: "opportunities", href: "/admin/volunteers/opportunities" },
    { key: "applications", href: "/admin/volunteers/applications" },
    { key: "hours", href: "/admin/volunteers/hours" },
    { key: "progression", href: "/admin/volunteers/progression" },
  ] as const;

  return (
    <nav className="mt-6 flex flex-wrap gap-4 text-sm">
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          className={active === link.key ? "border-b border-gold text-navy" : "text-graphite hover:text-navy"}
        >
          {t(`nav.${link.key}`)}
        </Link>
      ))}
    </nav>
  );
}
