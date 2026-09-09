import { Link } from "@/i18n/navigation";

export function SectionHeader({
  index,
  title,
  body,
  inverse = false,
}: {
  index: string;
  title: string;
  body?: string;
  inverse?: boolean;
}) {
  return (
    <header className={`section-heading${inverse ? " section-heading--inverse" : ""}`}>
      <span className="section-heading__index numeric">{index}</span>
      <div>
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
      </div>
    </header>
  );
}

export function Hero({
  eyebrow,
  headline,
  lede,
  primary,
  secondary,
  trust,
}: {
  eyebrow: string;
  headline: string;
  lede: string;
  primary: string;
  secondary: string;
  trust: string;
}) {
  return (
    <section className="home-hero">
      <div className="home-hero__grid site-container">
        <div className="home-hero__copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{headline}</h1>
          <p className="home-hero__lede">{lede}</p>
          <div className="action-row">
            <Link className="institutional-button institutional-button--primary" href="/membership/apply">
              {primary}<span aria-hidden>↗</span>
            </Link>
            <Link className="institutional-button institutional-button--secondary" href="/tracks">
              {secondary}<span aria-hidden>↓</span>
            </Link>
          </div>
          <p className="home-hero__trust">{trust}</p>
        </div>
      </div>
      <div className="home-hero__rule" aria-hidden />
    </section>
  );
}

export function EditorialGrid({ children }: { children: React.ReactNode }) {
  return <div className="editorial-grid">{children}</div>;
}

export function TrackItem({
  index,
  title,
  description,
  href,
}: {
  index: number;
  title: string;
  description?: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="track-item__number numeric">{String(index + 1).padStart(2, "0")}</span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      <span className="track-item__arrow" aria-hidden>↗</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="track-item">
        {body}
      </Link>
    );
  }
  return <article className="track-item">{body}</article>;
}

export function MembershipPreview({
  types,
  locale,
  verifiedLabel,
  codeLabel,
}: {
  types: Array<{ nameAr: string; nameEn: string; slug: string }>;
  locale: "ar" | "en";
  verifiedLabel: string;
  codeLabel: string;
}) {
  return (
    <div className="membership-preview">
      <div className="membership-card-preview" aria-label={verifiedLabel}>
        <div className="membership-card-preview__top">
          <span className="monogram">SEC</span>
          <span>{verifiedLabel}</span>
        </div>
        <div className="membership-card-preview__body">
          <p className="membership-card-preview__brand">عيادة الاستراتيجية والتنفيذ</p>
          <strong>{types[0] ? (locale === "ar" ? types[0].nameAr : types[0].nameEn) : verifiedLabel}</strong>
          <p className="numeric">SEC · MEMBER · ————</p>
        </div>
        <div className="membership-card-preview__qr" aria-hidden><i /><i /><i /></div>
        <span className="membership-card-preview__code">{codeLabel}</span>
      </div>
      <div className="membership-families">
        {types.slice(0, 4).map((type, index) => (
          <div key={type.slug} className={type.slug.includes("volunteer") ? "is-volunteer" : ""}>
            <span className="numeric">0{index + 1}</span>
            <strong>{locale === "ar" ? type.nameAr : type.nameEn}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VolunteerJourney({ steps }: { steps: string[] }) {
  return (
    <ol className="volunteer-journey">
      {steps.map((step, index) => (
        <li key={step}>
          <span className="numeric">0{index + 1}</span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  );
}

export function SiteFooter({ label, about, contact, verify }: { label: string; about: string; contact: string; verify: string }) {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer__grid">
        <div className="wordmark wordmark--footer"><strong>عيادة الاستراتيجية والتنفيذ</strong><span>STRATEGY &amp; EXECUTION CLINIC</span></div>
        <p>{label}</p>
        <nav aria-label={label}><Link href="/about">{about}</Link><Link href="/contact">{contact}</Link><Link href="/verify">{verify}</Link></nav>
      </div>
    </footer>
  );
}
