"use client";

import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  ["/account", "overview"],
  ["/account/membership", "membership"],
  ["/account/credential", "credential"],
  ["/account/tracks", "tracks"],
  ["/account/contributions", "contributions"],
  ["/account/consultations", "consultations"],
  ["/account/meetings", "meetings"],
  ["/account/notifications", "notifications"],
  ["/account/profile", "profile"],
  ["/account/security", "security"],
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberShell({
  children,
  labels,
}: {
  children: React.ReactNode;
  labels: Record<string, string>;
}) {
  const pathname = usePathname();
  return (
    <div className="member-shell">
      <aside className="member-shell__rail">
        <div>
          <p className="eyebrow">SEC · MEMBER</p>
          <h2>{labels.title}</h2>
          <p>{labels.subtitle}</p>
        </div>
        <nav aria-label={labels.title}>
          {LINKS.map(([href, key], index) => {
            const current = isActive(pathname, href);
            return (
              <Link
                href={href}
                key={href}
                aria-current={current ? "page" : undefined}
                className={current ? "is-active" : undefined}
              >
                <span className="numeric">{String(index + 1).padStart(2, "0")}</span>
                {labels[key]}
              </Link>
            );
          })}
        </nav>
        <p className="member-shell__privacy">{labels.privacy}</p>
      </aside>
      <div className="member-shell__content">{children}</div>
    </div>
  );
}
