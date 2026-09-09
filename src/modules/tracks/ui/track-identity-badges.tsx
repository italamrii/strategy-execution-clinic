import type { PublicTrackIdentity } from "@/modules/credentials/public-dto";

type TrackBadgeInput = {
  primaryTrack?: PublicTrackIdentity | null;
  isGroupLeader?: boolean;
  tracks?: Array<{ nameAr: string; nameEn: string; slug?: string; iconKey?: string }>;
  locale: "ar" | "en";
};

/**
 * Presentation-only badges. Never grant authorization — verified DB state only.
 */
export function TrackIdentityBadges({
  primaryTrack,
  isGroupLeader,
  tracks,
  locale,
}: TrackBadgeInput) {
  const isAr = locale === "ar";
  const items: Array<{ key: string; label: string; kind: "leader" | "primary" | "track" }> = [];

  if (isGroupLeader) {
    items.push({
      key: "group-leader",
      label: isAr ? "قائد المسار" : "Group Leader",
      kind: "leader",
    });
  }
  if (primaryTrack) {
    items.push({
      key: `primary-${primaryTrack.slug}`,
      label: isAr ? primaryTrack.nameAr : primaryTrack.nameEn,
      kind: "primary",
    });
  } else if (tracks?.[0]) {
    items.push({
      key: `track-${tracks[0].slug ?? tracks[0].nameEn}`,
      label: isAr ? tracks[0].nameAr : tracks[0].nameEn,
      kind: "track",
    });
  }

  if (items.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap gap-2" data-testid="track-identity-badges">
      {items.map((item) => (
        <li
          key={item.key}
          className={
            item.kind === "leader"
              ? "border border-gold bg-surface px-3 py-1 text-xs text-navy"
              : "border border-line bg-surface px-3 py-1 text-xs text-graphite"
          }
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
}
