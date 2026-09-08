"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function RecognitionAdminNav({
  active,
}: {
  active: "recognition" | "contributions" | "badges" | "certificates" | "impact" | "milestones";
}) {
  const t = useTranslations("adminRecognition");
  const links = [
    { key: "recognition" as const, href: "/admin/recognition" },
    { key: "contributions" as const, href: "/admin/contributions" },
    { key: "badges" as const, href: "/admin/recognition/badges" },
    { key: "certificates" as const, href: "/admin/recognition/certificates" },
    { key: "impact" as const, href: "/admin/recognition/impact" },
    { key: "milestones" as const, href: "/admin/recognition/milestones" },
  ];
  return (
    <nav className="mt-6 flex flex-wrap gap-4 text-sm">
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          className={
            active === link.key
              ? "border-b border-gold text-navy"
              : "text-graphite hover:text-navy"
          }
        >
          {t(`nav.${link.key}`)}
        </Link>
      ))}
    </nav>
  );
}
