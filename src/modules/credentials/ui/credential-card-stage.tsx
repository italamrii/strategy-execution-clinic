"use client";

import type { OwnCredentialDto } from "@/modules/credentials";
import { StaticMembershipCard } from "./credential-wallet";

export function CredentialCardStage({
  credential,
  locale,
}: {
  credential: OwnCredentialDto;
  locale: "ar" | "en";
}) {
  return <StaticMembershipCard credential={credential} locale={locale} />;
}
