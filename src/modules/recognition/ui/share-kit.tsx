"use client";

import { Link } from "@/i18n/navigation";

export function InstitutionalBadgeMark({
  name,
  publicCode,
}: {
  name: string;
  publicCode: string | null;
}) {
  return (
    <div className="flex size-28 items-center justify-center border border-gold bg-surface">
      <div className="flex size-16 rotate-45 items-center justify-center border border-navy">
        <span className="rotate-[-45deg] px-1 text-center text-[10px] leading-tight text-navy">
          {name}
        </span>
      </div>
      {publicCode ? <span className="sr-only">{publicCode}</span> : null}
    </div>
  );
}

export function ShareKit({
  kind,
  publicCode,
  locale,
  copyLabel,
  pngLabel,
  linkedInLabel,
}: {
  kind: "badge" | "certificate";
  publicCode: string;
  locale: "ar" | "en";
  copyLabel: string;
  pngLabel: string;
  linkedInLabel: string;
}) {
  const verifyPath = kind === "badge" ? `/badge/${publicCode}` : `/certificate/${publicCode}`;
  const png = `/api/recognition/share/${kind}/${encodeURIComponent(publicCode)}?variant=square&locale=${locale}`;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const verifyUrl = `${origin}/${locale}${verifyPath}`;
  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${origin}/${locale}${verifyPath}`)}`;

  return (
    <div className="mt-6 flex flex-wrap gap-3 text-sm">
      <Link href={verifyPath} className="text-gold-deep">
        {copyLabel}
      </Link>
      <a href={png} className="text-gold-deep">
        {pngLabel}
      </a>
      <a href={linkedIn} className="text-gold-deep" rel="noreferrer" target="_blank">
        {linkedInLabel}
      </a>
      <span className="sr-only">{verifyUrl}</span>
    </div>
  );
}
