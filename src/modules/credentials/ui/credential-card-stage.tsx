"use client";

import { useTranslations } from "next-intl";
import type { OwnCredentialDto } from "@/modules/credentials";
import { MembershipCard3D } from "@/shared/three/membership-card-3d";
import { StaticMembershipCard } from "./credential-wallet";

export function CredentialCardStage({
  credential,
  locale,
}: {
  credential: OwnCredentialDto;
  locale: "ar" | "en";
}) {
  const t = useTranslations("credential");
  return (
    <div className="space-y-8">
      <MembershipCard3D
        credentialId={credential.id}
        locale={locale}
        ariaLabel={t("cardPresentationLabel")}
        hint={t("cardPresentationHint")}
        flipLabel={t("flipCard")}
      />
      <StaticMembershipCard credential={credential} locale={locale} />
    </div>
  );
}
