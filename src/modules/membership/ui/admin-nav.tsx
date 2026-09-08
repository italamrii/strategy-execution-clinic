import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function AdminMembershipNav({
  active,
}: {
  active: "dashboard" | "applications" | "types" | "tracks" | "issue";
}) {
  const t = await getTranslations("adminMembership");
  const items = [
    { key: "dashboard" as const, href: "/admin/memberships" },
    { key: "applications" as const, href: "/admin/memberships/applications" },
    { key: "types" as const, href: "/admin/memberships/types" },
    { key: "tracks" as const, href: "/admin/memberships/tracks" },
    { key: "issue" as const, href: "/admin/memberships/issue" },
  ];
  return (
    <nav className="mt-6 flex flex-wrap gap-4 text-sm">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={
            active === item.key
              ? "border-b border-gold text-navy"
              : "text-graphite hover:text-navy"
          }
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
