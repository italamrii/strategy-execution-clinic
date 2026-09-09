"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/text-field";
import { OTPInput } from "@/shared/ui/otp-input";
import { StatusAlert } from "@/shared/ui/status-alert";
import { completeClerkLoginAction } from "@/modules/identity/actions";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy =
    pending ||
    signInFetchStatus === "fetching" ||
    signUpFetchStatus === "fetching";

  const mapClerkError = (err: unknown): string => {
    if (isClerkAPIResponseError(err)) {
      const codeValue = err.errors[0]?.code;
      if (
        codeValue === "form_code_incorrect" ||
        codeValue === "verification_failed" ||
        codeValue === "form_identifier_not_found"
      ) {
        return t("errors.invalidOtp");
      }
      if (codeValue === "too_many_requests" || codeValue === "rate_limit_exceeded") {
        return t("errors.rateLimited");
      }
    }
    if (err && typeof err === "object" && "code" in err) {
      const value = String((err as { code: string }).code);
      if (value === "account_restricted") return t("errors.restricted");
      if (value === "rate_limited") return t("errors.rateLimited");
    }
    return t("errors.generic");
  };

  const finalizeAndEnter = async () => {
    const result = await completeClerkLoginAction({ locale });
    if (!result.ok) {
      setError(mapClerkError({ code: result.code }));
      setStep("code");
      return;
    }
    setStep("success");
    window.setTimeout(() => {
      router.replace("/account");
      router.refresh();
    }, 650);
  };

  const sendCode = async () => {
    if (!signIn) throw new Error("sign_in_unavailable");
    const { error: createError } = await signIn.create({
      identifier: email.trim(),
      signUpIfMissing: true,
    });
    if (createError) throw createError;
    const { error: sendError } = await signIn.emailCode.sendCode();
    if (sendError) throw sendError;
  };

  const verifyCode = async () => {
    if (!signIn || !signUp) throw new Error("sign_in_unavailable");
    const { error } = await signIn.emailCode.verifyCode({ code });

    if (error) {
      if (
        isClerkAPIResponseError(error) &&
        error.errors[0]?.code === "sign_up_if_missing_transfer"
      ) {
        const { error: transferError } = await signUp.create({ transfer: true });
        if (transferError) throw transferError;
        if (signUp.status === "complete") {
          await signUp.finalize({
            navigate: async () => {
              await finalizeAndEnter();
            },
          });
          return;
        }
        throw new Error("sign_up_incomplete");
      }
      throw error;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: async () => {
          await finalizeAndEnter();
        },
      });
      return;
    }

    throw new Error("sign_in_incomplete");
  };

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
              try {
                await sendCode();
                setNotice(t("sentConfirmation"));
                setStep("code");
              } catch (err) {
                setError(mapClerkError(err));
              }
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
            disabled={busy}
          />
          {error ? <StatusAlert>{error}</StatusAlert> : null}
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? t("sending") : t("sendCode")}
            <span aria-hidden>←</span>
          </Button>
          {/* Required for Clerk bot protection on sign-up paths */}
          <div id="clerk-captcha" />
        </form>
      ) : step === "code" ? (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setNotice(null);
            startTransition(async () => {
              try {
                await verifyCode();
              } catch (err) {
                setError(mapClerkError(err));
              }
            });
          }}
        >
          <StatusAlert tone="info">
            {notice ?? t("sentConfirmation")} <b dir="ltr">{email}</b>
          </StatusAlert>
          <OTPInput
            value={code}
            onChange={setCode}
            label={t("code")}
            disabled={busy}
          />
          {error ? <StatusAlert>{error}</StatusAlert> : null}
          <Button
            className="w-full"
            type="submit"
            disabled={busy || code.length !== 6}
          >
            {busy ? t("verifying") : t("verify")}
          </Button>
          <div className="auth-code-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setNotice(null);
                startTransition(async () => {
                  try {
                    await sendCode();
                    setNotice(t("resent"));
                  } catch (err) {
                    setError(mapClerkError(err));
                  }
                });
              }}
            >
              {busy ? t("resending") : t("resendCode")}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setNotice(null);
                void signIn?.reset();
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
