import { getTranslations } from "next-intl/server";
import { AccessDeniedActions } from "./access-denied-actions";

export async function AccessDenied({
  status,
  email,
}: {
  status: "unauthenticated" | "forbidden";
  email?: string | null;
}) {
  const t = await getTranslations("access");
  const httpStatus = status === "unauthenticated" ? "401" : "403";
  const title = status === "unauthenticated" ? t("unauthorizedTitle") : t("forbiddenTitle");
  const body = status === "unauthenticated" ? t("unauthorizedBody") : t("forbiddenBody");

  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-16" data-access="denied">
      <section className="rounded-2xl border border-line bg-surface p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold tracking-widest text-muted" aria-hidden="true">
          {httpStatus}
        </p>
        <p className="sr-only">{t("httpStatus", { status: httpStatus })}</p>
        <h1 className="mt-4 text-3xl text-navy">{title}</h1>
        <p className="mt-4 leading-8 text-muted">{body}</p>
        {status === "forbidden" && email ? (
          <p className="mt-4 break-words rounded-lg bg-gold/10 p-4 text-sm text-ink" dir="ltr">
            <span className="block text-xs text-muted">{t("signedInAs")}</span>
            {email}
          </p>
        ) : null}
        <AccessDeniedActions status={status} />
      </section>
    </main>
  );
}
