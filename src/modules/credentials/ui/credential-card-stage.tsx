"use client";

import dynamic from "next/dynamic";
import type { OwnCredentialDto } from "@/modules/credentials";
import { StaticMembershipCard } from "./credential-wallet";

const MembershipCard3D = dynamic(
  () => import("@/shared/three/membership-card-3d").then((mod) => mod.MembershipCard3D),
  {
    ssr: false,
    loading: () => <div className="mx-auto aspect-[1.6/1] w-full max-w-xl animate-pulse bg-ivory" />,
  },
);

export function CredentialCardStage({
  credential,
  locale,
}: {
  credential: OwnCredentialDto;
  locale: "ar" | "en";
}) {
  const memberName =
    locale === "ar"
      ? credential.memberNameAr
      : credential.memberNameEn ?? credential.memberNameAr;
  const typeLabel =
    locale === "ar" ? credential.membershipTypeAr : credential.membershipTypeEn;

  return (
    <MembershipCard3D
      memberName={memberName}
      typeLabel={typeLabel}
      publicCode={credential.publicCode}
      variant={credential.membershipTypeSlug}
      ariaLabel={credential.publicCode}
      fallback={<StaticMembershipCard credential={credential} locale={locale} />}
    />
  );
}
