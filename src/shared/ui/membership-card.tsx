type Variant =
  | "founding"
  | "expert"
  | "professional"
  | "volunteer"
  | "leader"
  | "distinguished";

const chrome: Record<Variant, string> = {
  founding: "border-gold shadow-[inset_0_0_0_1px_rgba(196,165,116,0.45)]",
  expert: "border-navy",
  professional: "border-line-strong",
  volunteer: "border-gold-deep",
  leader: "border-navy-deep",
  distinguished: "border-gold",
};

export function MembershipCardVisual({
  variant,
  clinic,
  nameAr,
  nameEn,
  typeAr,
  typeEn,
  track,
  memberId,
  status,
  hours,
}: {
  variant: Variant;
  clinic: string;
  nameAr: string;
  nameEn: string;
  typeAr: string;
  typeEn: string;
  track: string;
  memberId: string;
  status: string;
  hours?: string;
}) {
  return (
    <article
      className={`relative aspect-[1.6/1] w-full overflow-hidden border bg-surface p-6 text-start ${chrome[variant]}`}
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gold" />
      <p className="text-[0.65rem] font-medium tracking-[0.22em] text-gold-deep uppercase">
        {clinic}
      </p>
      <h3 className="mt-6 text-2xl leading-snug text-ink">{nameAr}</h3>
      <p className="mt-1 font-[family-name:var(--font-latin)] text-sm text-graphite">
        {nameEn}
      </p>
      <p className="mt-4 text-sm text-ink">
        {typeEn}
        <span className="mx-2 text-gold">·</span>
        {typeAr}
      </p>
      <p className="mt-1 text-sm text-graphite">{track}</p>
      <dl className="mt-6 grid gap-1 text-xs text-graphite">
        <div className="flex justify-between gap-4">
          <dt>ID</dt>
          <dd className="numeric text-ink">{memberId}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Status</dt>
          <dd className="text-success">{status}</dd>
        </div>
        {hours ? (
          <div className="flex justify-between gap-4">
            <dt>Hours</dt>
            <dd className="numeric">{hours}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
