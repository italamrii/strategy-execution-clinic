import type { EmailMessage } from "@/shared/ports/email";
import { buildTrustedUrl, sanitizePlainText } from "./sanitize";

type TemplateVars = Record<string, string>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(locale: "ar" | "en", title: string, body: string, cta?: { label: string; href: string }) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const clinic = locale === "ar" ? "عيادة الاستراتيجية والتنفيذ" : "Strategy & Execution Clinic";
  const footer =
    locale === "ar"
      ? "هذه رسالة معاملات من العيادة. لا تشارك رموز الدخول مع أي شخص."
      : "This is a transactional message from the Clinic. Never share login codes with anyone.";
  const ctaBlock = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.href)}" style="background:#152238;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px">${escapeHtml(cta.label)}</a></p>`
    : "";
  return `<!DOCTYPE html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Arial,sans-serif;background:#f7f5f0;color:#152238;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e1d8;padding:24px"><p style="color:#a68654;font-size:12px;letter-spacing:0.08em">${escapeHtml(clinic)}</p><h1 style="font-size:20px;margin:16px 0">${escapeHtml(title)}</h1><div style="font-size:15px;line-height:1.6">${body}</div>${ctaBlock}<p style="font-size:12px;color:#6b7280;margin-top:32px">${escapeHtml(footer)}</p></div></body></html>`;
}

const TEMPLATE_BUILDERS: Record<
  string,
  (locale: "ar" | "en", vars: TemplateVars, appOrigin: string) => { subject: string; html: string }
> = {
  "auth.otp": (locale, vars) => {
    const code = sanitizePlainText(vars.code ?? "", 12);
    const title = locale === "ar" ? "رمز الدخول" : "Sign-in code";
    const body =
      locale === "ar"
        ? `<p>رمز الدخول الخاص بك هو <strong>${escapeHtml(code)}</strong>. ينتهي خلال دقائق قليلة.</p>`
        : `<p>Your sign-in code is <strong>${escapeHtml(code)}</strong>. It expires shortly.</p>`;
    return { subject: title, html: layout(locale, title, body) };
  },
  "membership.submitted": (locale) => {
    const title = locale === "ar" ? "تم استلام طلب العضوية" : "Membership application received";
    const body =
      locale === "ar"
        ? "<p>تم استلام طلب العضوية وهو قيد المراجعة.</p>"
        : "<p>Your membership application was received and is under review.</p>";
    return { subject: title, html: layout(locale, title, body) };
  },
  "membership.changes_requested": (locale, vars, appOrigin) => {
    const title = locale === "ar" ? "مطلوب تعديلات" : "Changes requested";
    const body =
      locale === "ar"
        ? "<p>يرجى مراجعة طلب العضوية وتحديثه.</p>"
        : "<p>Please review and update your membership application.</p>";
    const href = buildTrustedUrl("/account/membership", appOrigin);
    const label = locale === "ar" ? "فتح الطلب" : "Open application";
    return { subject: title, html: layout(locale, title, body, { label, href }) };
  },
  "membership.approved": (locale, _vars, appOrigin) => {
    const title = locale === "ar" ? "تمت الموافقة على العضوية" : "Membership approved";
    const body =
      locale === "ar"
        ? "<p>تهانينا! تمت الموافقة على عضويتك في العيادة.</p>"
        : "<p>Congratulations! Your Clinic membership was approved.</p>";
    const href = buildTrustedUrl("/account/membership", appOrigin);
    const label = locale === "ar" ? "عرض العضوية" : "View membership";
    return { subject: title, html: layout(locale, title, body, { label, href }) };
  },
  "membership.rejected": (locale) => {
    const title = locale === "ar" ? "لم تُقبل العضوية" : "Membership not approved";
    const body =
      locale === "ar"
        ? "<p>لم تُقبل طلب العضوية في هذه المرحلة.</p>"
        : "<p>Your membership application was not approved at this time.</p>";
    return { subject: title, html: layout(locale, title, body) };
  },
  "membership.suspended": (locale, _vars, appOrigin) => {
    const title = locale === "ar" ? "تم تعليق العضوية" : "Membership suspended";
    const body =
      locale === "ar"
        ? "<p>تم تعليق عضويتك. راجع حسابك للتفاصيل.</p>"
        : "<p>Your membership was suspended. Check your account for details.</p>";
    const href = buildTrustedUrl("/account/membership", appOrigin);
    const label = locale === "ar" ? "عرض الحالة" : "View status";
    return { subject: title, html: layout(locale, title, body, { label, href }) };
  },
  "credential.issued": (locale, _vars, appOrigin) => {
    const title = locale === "ar" ? "تم إصدار الاعتماد" : "Credential issued";
    const body =
      locale === "ar"
        ? "<p>اعتمادك الرقمي جاهز في محفظتك.</p>"
        : "<p>Your digital credential is ready in your wallet.</p>";
    const href = buildTrustedUrl("/account/credential", appOrigin);
    const label = locale === "ar" ? "فتح المحفظة" : "Open wallet";
    return { subject: title, html: layout(locale, title, body, { label, href }) };
  },
  "credential.revoked": (locale) => {
    const title = locale === "ar" ? "تم إلغاء الاعتماد" : "Credential revoked";
    const body =
      locale === "ar"
        ? "<p>تم إلغاء اعتمادك الرقمي.</p>"
        : "<p>Your digital credential was revoked.</p>";
    return { subject: title, html: layout(locale, title, body) };
  },
  "volunteer.application_accepted": (locale, _vars, appOrigin) => {
    const title = locale === "ar" ? "قُبلت فرصة التطوع" : "Volunteer application accepted";
    const body =
      locale === "ar"
        ? "<p>تم قبول طلبك للمشاركة في فرصة التطوع.</p>"
        : "<p>Your volunteer application was accepted.</p>";
    const href = buildTrustedUrl("/account/volunteer", appOrigin);
    const label = locale === "ar" ? "عرض التطوع" : "View volunteering";
    return { subject: title, html: layout(locale, title, body, { label, href }) };
  },
  "volunteer.application_rejected": (locale) => {
    const title = locale === "ar" ? "لم يُقبل طلب التطوع" : "Volunteer application rejected";
    const body =
      locale === "ar"
        ? "<p>لم يُقبل طلبك لهذه الفرصة.</p>"
        : "<p>Your volunteer application was not accepted for this opportunity.</p>";
    return { subject: title, html: layout(locale, title, body) };
  },
  "volunteer.hours_approved": (locale, vars) => {
    const hours = sanitizePlainText(vars.hours ?? "", 16);
    const title = locale === "ar" ? "تم اعتماد ساعات التطوع" : "Volunteer hours approved";
    const body =
      locale === "ar"
        ? `<p>تم اعتماد <strong>${escapeHtml(hours)}</strong> ساعة تطوع.</p>`
        : `<p><strong>${escapeHtml(hours)}</strong> volunteer hour(s) were approved.</p>`;
    return { subject: title, html: layout(locale, title, body) };
  },
  "volunteer.hours_rejected": (locale) => {
    const title = locale === "ar" ? "لم تُعتمد ساعات التطوع" : "Volunteer hours rejected";
    const body =
      locale === "ar"
        ? "<p>لم تُعتمد ساعات التطوع المقدّمة.</p>"
        : "<p>Your submitted volunteer hours were not approved.</p>";
    return { subject: title, html: layout(locale, title, body) };
  },
  "volunteer.level_changed": (locale, vars) => {
    const level = sanitizePlainText(vars.level ?? "", 64);
    const title = locale === "ar" ? "تغيّر مستوى التطوع" : "Volunteer level changed";
    const body =
      locale === "ar"
        ? `<p>تم تحديث مستوى تطوعك إلى <strong>${escapeHtml(level)}</strong>.</p>`
        : `<p>Your volunteer level was updated to <strong>${escapeHtml(level)}</strong>.</p>`;
    return { subject: title, html: layout(locale, title, body) };
  },
  "recognition.contribution_approved": (locale, _vars, appOrigin) => {
    const title = locale === "ar" ? "تم اعتماد المساهمة" : "Contribution approved";
    const body =
      locale === "ar"
        ? "<p>تم اعتماد مساهمتك المهنية.</p>"
        : "<p>Your contribution was approved.</p>";
    const href = buildTrustedUrl("/account/contributions", appOrigin);
    const label = locale === "ar" ? "عرض المساهمات" : "View contributions";
    return { subject: title, html: layout(locale, title, body, { label, href }) };
  },
  "recognition.contribution_rejected": (locale) => {
    const title = locale === "ar" ? "لم تُعتمد المساهمة" : "Contribution rejected";
    const body =
      locale === "ar"
        ? "<p>لم تُعتمد مساهمتك في هذه المرحلة.</p>"
        : "<p>Your contribution was not approved at this time.</p>";
    return { subject: title, html: layout(locale, title, body) };
  },
  "recognition.badge_awarded": (locale, vars, appOrigin) => {
    const badge = sanitizePlainText(vars.badgeName ?? "", 120);
    const title = locale === "ar" ? "حصلت على شارة" : "Badge awarded";
    const body =
      locale === "ar"
        ? `<p>تم منحك شارة <strong>${escapeHtml(badge)}</strong>.</p>`
        : `<p>You were awarded the <strong>${escapeHtml(badge)}</strong> badge.</p>`;
    const href = buildTrustedUrl("/account/contributions", appOrigin);
    const label = locale === "ar" ? "عرض الاعتراف" : "View recognition";
    return { subject: title, html: layout(locale, title, body, { label, href }) };
  },
  "recognition.certificate_issued": (locale, _vars, appOrigin) => {
    const title = locale === "ar" ? "تم إصدار شهادة" : "Certificate issued";
    const body =
      locale === "ar"
        ? "<p>شهادتك المعتمدة جاهزة للتحقق.</p>"
        : "<p>Your certificate is ready for verification.</p>";
    const href = buildTrustedUrl("/account/contributions", appOrigin);
    const label = locale === "ar" ? "عرض الشهادات" : "View certificates";
    return { subject: title, html: layout(locale, title, body, { label, href }) };
  },
  "system.announcement": (locale, vars, appOrigin) => {
    const title = sanitizePlainText(vars.title ?? (locale === "ar" ? "إعلان" : "Announcement"), 200);
    const message = sanitizePlainText(vars.message ?? "", 2000);
    const body = `<p>${escapeHtml(message)}</p>`;
    const ctaPath = vars.ctaPath;
    const cta =
      ctaPath && ctaPath.startsWith("/")
        ? {
            label: sanitizePlainText(vars.ctaLabel ?? (locale === "ar" ? "المزيد" : "Learn more"), 80),
            href: buildTrustedUrl(ctaPath, appOrigin),
          }
        : undefined;
    return { subject: title, html: layout(locale, title, body, cta) };
  },
};

export function renderEmailTemplate(
  template: string,
  locale: "ar" | "en",
  variables: Record<string, string>,
  appOrigin: string,
): { subject: string; html: string; text: string } {
  const builder = TEMPLATE_BUILDERS[template];
  if (!builder) {
    throw new Error(`unknown_email_template:${template}`);
  }
  const safeVars = Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [k, sanitizePlainText(v, 2000)]),
  );
  const { subject, html } = builder(locale, safeVars, appOrigin);
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { subject, html, text };
}

export function toEmailMessage(input: {
  to: string;
  locale: "ar" | "en";
  template: string;
  variables: Record<string, string>;
  appOrigin: string;
}): EmailMessage & { subject: string; html: string; text: string } {
  const rendered = renderEmailTemplate(input.template, input.locale, input.variables, input.appOrigin);
  return {
    to: input.to,
    locale: input.locale,
    template: input.template,
    variables: input.variables,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  };
}
