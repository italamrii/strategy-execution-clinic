import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import {
  getOptionalAuthContext,
  getPrivateAccount,
  getRolesForUser,
} from "@/modules/identity";
import { listOwnApplications, listOwnMemberships } from "@/modules/membership";
import { listOwnCredentials } from "@/modules/credentials";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  setRequestLocale(locale);
  const auth = await getOptionalAuthContext();
  if (!auth) {
    redirect({ href: "/login", locale });
  }
  const [account, roles, t, memberships, applications, credentials] = await Promise.all([
    getPrivateAccount(auth!.userId),
    getRolesForUser(auth!.userId),
    getTranslations("account"),
    listOwnMemberships(auth!.userId),
    listOwnApplications(auth!.userId),
    listOwnCredentials(auth!.userId).catch(() => []),
  ]);
  const latestApp = applications[0];
  const active = memberships.find((item) => item.status === "active");
  const card = credentials.find((item) => item.effectiveStatus === "active") ?? credentials[0];

  let nextHref = "/membership/apply";
  let nextKey: "nextApply" | "nextWait" | "nextUpdate" | "nextCard" | "nextContribute" = "nextApply";
  if (latestApp?.status === "changes_requested") {
    nextHref = "/membership/apply";
    nextKey = "nextUpdate";
  } else if (latestApp && ["submitted", "under_review"].includes(latestApp.status)) {
    nextHref = "/account/membership";
    nextKey = "nextWait";
  } else if (active && card) {
    nextHref = "/account/credential";
    nextKey = "nextCard";
  } else if (active) {
    nextHref = "/account/tracks";
    nextKey = "nextContribute";
  }

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-graphite">{t("overviewLead")}</p>
      <section className="mt-10 border border-line bg-surface p-8">
        <p className="eyebrow">{t("nextStepEyebrow")}</p>
        <h2 className="mt-2 text-2xl text-ink">{t(nextKey)}</h2>
        <Link className="mt-6 inline-flex institutional-button institutional-button--primary" href={nextHref}>
          {t("nextAction")}
        </Link>
      </section>
      <dl className="mt-10 grid max-w-xl gap-4 border border-line bg-surface p-8 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("email")}</dt>
          <dd className="text-ink">{account?.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("status")}</dt>
          <dd className="text-ink">{account?.status}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("locale")}</dt>
          <dd className="text-ink">{account?.locale}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t("roles")}</dt>
          <dd className="text-ink">{roles.join(", ")}</dd>
        </div>
      </dl>
      <p className="mt-6 max-w-xl text-sm text-muted">{t("privateNote")}</p>
    </main>
  );
}
