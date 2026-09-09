import { getTranslations } from "next-intl/server";
import { MemberShell } from "@/shared/ui/member-shell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const account = await getTranslations("account");
  const credential = await getTranslations("credential");
  return <MemberShell labels={{ title: account("title"), subtitle: account("memberAreaSubtitle"), overview: account("overview"), profile: account("profile"), membership: account("membership"), credential: credential("nav"), volunteer: account("volunteer"), contributions: account("contributions"), consultations: account("consultations"), meetings: account("meetings"), notifications: account("notifications"), security: account("security"), privacy: account("privateNote") }}>{children}</MemberShell>;
}
