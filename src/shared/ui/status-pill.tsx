type Tone = "active" | "revoked" | "suspended" | "expired" | "pending";

const tones: Record<Tone, string> = {
  active: "border-success text-success",
  revoked: "border-danger text-danger",
  suspended: "border-warning text-warning",
  expired: "border-graphite text-graphite",
  pending: "border-gold-deep text-gold-deep",
};

export function StatusPill({
  tone,
  children,
}: {
  tone: Tone;
  children: string;
}) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
