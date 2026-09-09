import { Link } from "@/i18n/navigation";

export function MemberShell({ children, labels }: { children: React.ReactNode; labels: Record<string, string> }) {
  const links = [
    ["/account", "overview"], ["/account/profile", "profile"], ["/account/membership", "membership"],
    ["/account/credential", "credential"], ["/account/volunteer", "volunteer"], ["/account/contributions", "contributions"],
    ["/account/consultations", "consultations"], ["/account/meetings", "meetings"],
    ["/account/notifications", "notifications"], ["/account/security", "security"],
  ] as const;
  return (
    <div className="member-shell">
      <aside className="member-shell__rail">
        <div><p className="eyebrow">SEC · MEMBER</p><h2>{labels.title}</h2><p>{labels.subtitle}</p></div>
        <nav aria-label={labels.title}>{links.map(([href, key], index) => <Link href={href} key={href}><span className="numeric">0{index + 1}</span>{labels[key]}</Link>)}</nav>
        <p className="member-shell__privacy">{labels.privacy}</p>
      </aside>
      <div className="member-shell__content">{children}</div>
    </div>
  );
}
