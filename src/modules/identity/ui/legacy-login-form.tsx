"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/text-field";
import { OTPInput } from "@/shared/ui/otp-input";
import { StatusAlert } from "@/shared/ui/status-alert";
import { requestOtpAction, verifyOtpAction } from "@/modules/identity/actions";

/** Legacy local OTP form — only used when AUTH_PROVIDER=legacy. */
export function LegacyLoginForm({
  showLocalOtpHint = false,
}: {
  showLocalOtpHint?: boolean;
}) {
  const t = useTranslations("auth");
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mapError = (value: string) =>
    value === "rate_limited"
      ? t("errors.rateLimited")
      : value === "otp_cooldown"
        ? t("errors.cooldown")
        : value === "invalid_otp" || value === "otp_locked" || value === "expired_otp"
          ? t("errors.invalidOtp")
          : value === "account_restricted"
            ? t("errors.restricted")
            : t("errors.generic");

  return (
    <div className="auth-panel">
      <div className="auth-panel__heading">
        <p className="eyebrow">SEC · ACCESS</p>
        <h2>{t("title")}</h2>
        <p>{t("subtitle")}</p>
      </div>
      {step === "email" ? (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setNotice(null);
            startTransition(async () => {
              const result = await requestOtpAction({ email, locale });
              if (!result.ok) return setError(mapError(result.code));
              setNotice(t("sentConfirmation"));
              setStep("code");
            });
          }}
        >
          <TextField
            label={t("email")}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
          />
          {error ? <StatusAlert>{error}</StatusAlert> : null}
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? t("sending") : t("sendCode")}
            <span aria-hidden>←</span>
          </Button>
        </form>
      ) : step === "code" ? (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setNotice(null);
            startTransition(async () => {
              const result = await verifyOtpAction({ email, code });
              if (!result.ok) return setError(mapError(result.code));
              setStep("success");
              window.setTimeout(() => {
                router.replace("/account");
                router.refresh();
              }, 650);
            });
          }}
        >
          <StatusAlert tone="info">
            {notice ?? t("sentConfirmation")} <b dir="ltr">{email}</b>
          </StatusAlert>
          {showLocalOtpHint ? (
            <StatusAlert tone="info">{t("localOtpHint")}</StatusAlert>
          ) : null}
          <OTPInput
            value={code}
            onChange={setCode}
            label={t("code")}
            disabled={pending}
          />
          {error ? <StatusAlert>{error}</StatusAlert> : null}
          <Button
            className="w-full"
            type="submit"
            disabled={pending || code.length !== 6}
          >
            {pending ? t("verifying") : t("verify")}
          </Button>
          <div className="auth-code-actions">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setNotice(null);
                startTransition(async () => {
                  const result = await requestOtpAction({ email, locale });
                  if (!result.ok) return setError(mapError(result.code));
                  setNotice(t("resent"));
                });
              }}
            >
              {pending ? t("resending") : t("resendCode")}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setNotice(null);
              }}
            >
              {t("changeEmail")}
            </button>
          </div>
        </form>
      ) : (
        <StatusAlert tone="success">{t("success")}</StatusAlert>
      )}
      <div className="auth-panel__security">
        <span aria-hidden>◇</span>
        <p>{t("securityNote")}</p>
      </div>
    </div>
  );
}
