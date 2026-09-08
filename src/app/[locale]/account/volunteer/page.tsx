import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireLocale } from "@/i18n/locale";
import { getOptionalAuthContext } from "@/modules/identity";
import {
  getVolunteerDashboard,
} from "@/modules/volunteering";
import { VolunteerActivateForm } from "@/modules/volunteering/ui/activate-form";
import { VolunteerHoursForm } from "@/modules/volunteering/ui/hours-form";

export const dynamic = "force-dynamic";

export default async function AccountVolunteerPage({
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
  const t = await getTranslations("volunteerDashboard");
  const dashboard = await getVolunteerDashboard(auth!.userId);

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl text-ink">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-graphite">{t("subtitle")}</p>
      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/account" className="text-graphite hover:text-navy">
          {t("account")}
        </Link>
        <Link href="/account/volunteer" className="border-b border-gold text-navy">
          {t("title")}
        </Link>
      </nav>

      {!dashboard.hasProfile ? (
        <section className="mt-12 border border-line bg-surface p-8">
          <h2 className="text-2xl text-navy">{t("activateTitle")}</h2>
          <p className="mt-2 text-graphite">{t("activateBody")}</p>
          <VolunteerActivateForm />
        </section>
      ) : (
        <>
          <section className="mt-12 grid gap-4 border border-line bg-surface p-8 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted">{t("status")}</p>
              <p className="text-xl text-navy">{dashboard.profile.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted">{t("approvedHours")}</p>
              <p className="text-xl text-navy">{dashboard.profile.approvedHours}</p>
            </div>
            <div>
              <p className="text-sm text-muted">{t("pendingHours")}</p>
              <p className="text-xl text-navy">{dashboard.profile.pendingHours}</p>
            </div>
            <div>
              <p className="text-sm text-muted">{t("impactScore")}</p>
              <p className="text-xl text-navy">{dashboard.profile.impactScore}</p>
            </div>
            <div className="md:col-span-4">
              <p className="text-sm text-muted">{t("progressionLevel")}</p>
              <p className="text-lg text-gold-deep">{dashboard.profile.progressionLevel}</p>
            </div>
          </section>

          <section className="mt-10 border border-line bg-surface p-8">
            <h2 className="text-xl text-navy">{t("submitHours")}</h2>
            <VolunteerHoursForm />
          </section>

          <section className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-xl text-navy">{t("applications")}</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {dashboard.applications.map((a) => (
                  <li key={a.id} className="border border-line p-3">
                    {a.status} · {a.submittedAt?.slice(0, 10) ?? "—"}
                  </li>
                ))}
                {dashboard.applications.length === 0 ? (
                  <li className="text-muted">{t("emptyApplications")}</li>
                ) : null}
              </ul>
            </div>
            <div>
              <h2 className="text-xl text-navy">{t("hourHistory")}</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {dashboard.hourEntries.map((e) => (
                  <li key={e.id} className="border border-line p-3">
                    {e.hours}h · {e.status} · {e.activityDate ?? "—"}
                    <p className="mt-1 text-muted">{e.description}</p>
                  </li>
                ))}
              </ul>
              {dashboard.adjustments.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-navy">{t("adjustments")}</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {dashboard.adjustments.map((a) => (
                      <li key={a.id} className="border border-line p-3">
                        {a.deltaHours}h · {a.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
