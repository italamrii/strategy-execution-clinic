"use client";

import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { completeClerkLoginAction } from "@/modules/identity/actions";
import { Button } from "@/shared/ui/button";
import { OTPInput } from "@/shared/ui/otp-input";
import { StatusAlert } from "@/shared/ui/status-alert";
import { TextField } from "@/shared/ui/text-field";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as "ar" | "en";
  const { getToken } = useAuth();
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
      if (value === "invalid_otp") return t("errors.invalidOtp");
    }
    return t("errors.generic");
  };

  const goToAccount = () => {
    // Full document navigation so Clerk session cookies are visible to middleware
    // on the first account request (client transitions can race cookie settle).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation after Clerk finalize
    window.location.assign(`/${locale}/account`);
  };

  const finalizeAndEnter = async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const token = await getToken().catch(() => null);
      if (!token) {
        await sleep(250);
        continue;
      }
      const result = await completeClerkLoginAction({ locale });
      if (result.ok) {
        setStep("success");
        await sleep(350);
        goToAccount();
        return;
      }
      if (result.code === "account_restricted") {
        setError(t("errors.restricted"));
        setStep("code");
        return;
      }
      await sleep(250);
    }
    goToAccount();
  };

  const fillMissingSignUpFields = async () => {
    if (!signUp) return;
    const localPart = email.trim().split("@")[0] || "member";
    const missing = new Set(
      [...(signUp.missingFields ?? []), ...(signUp.optionalFields ?? [])].map(String),
    );
    const payload: {
      firstName?: string;
      lastName?: string;
      legalAccepted?: boolean;
    } = {};

    if (
      missing.size === 0 ||
      missing.has("first_name") ||
      missing.has("firstName")
    ) {
      payload.firstName = localPart.slice(0, 40);
    }
    if (
      missing.size === 0 ||
      missing.has("last_name") ||
      missing.has("lastName")
    ) {
      payload.lastName = "Clinic";
    }
    if (missing.has("legal_accepted") || missing.has("legalAccepted")) {
      payload.legalAccepted = true;
    }

    const { error } = await signUp.update(payload);
    if (error) throw error;
  };

  const completeActiveSignIn = async () => {
    if (!signIn) throw new Error("sign_in_unavailable");
    if (signIn.status !== "complete") {
      throw Object.assign(new Error("sign_in_incomplete"), {
        code: "invalid_otp",
        status: signIn.status,
      });
    }
    const { error } = await signIn.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) {
          throw Object.assign(new Error("session_task"), {
            code: "invalid_otp",
          });
        }
      },
    });
    if (error) throw error;
    await finalizeAndEnter();
  };

  const completeActiveSignUp = async () => {
    if (!signUp) throw new Error("sign_up_unavailable");

    for (let attempt = 0; attempt < 4; attempt++) {
      if (signUp.status === "complete") break;
      if (signUp.status === "missing_requirements") {
        await fillMissingSignUpFields();
        continue;
      }
      break;
    }

    if (signUp.status !== "complete") {
      throw Object.assign(new Error("sign_up_incomplete"), {
        code: "invalid_otp",
        status: signUp.status,
        missingFields: signUp.missingFields,
        unverifiedFields: signUp.unverifiedFields,
      });
    }

    const { error } = await signUp.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) {
          throw Object.assign(new Error("session_task"), {
            code: "invalid_otp",
          });
        }
      },
    });
    if (error) throw error;
    await finalizeAndEnter();
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
        await completeActiveSignUp();
        return;
      }
      throw error;
    }

    if (signIn.status === "complete") {
      await completeActiveSignIn();
      return;
    }

    // Some instances transfer into sign-up after a successful verify without the
    // dedicated transfer error code.
    if (signUp.status === "complete" || signUp.status === "missing_requirements") {
      await completeActiveSignUp();
      return;
    }

    throw Object.assign(new Error("sign_in_incomplete"), {
      code: "invalid_otp",
      status: signIn.status,
    });
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
