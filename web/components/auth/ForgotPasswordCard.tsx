"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import AuthField from "@/components/auth/AuthField";
import AuthFormError from "@/components/auth/AuthFormError";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import { AuthHeading } from "@/components/auth/AuthCard";
import { isValidLoginEmail } from "@/lib/auth/loginRules";
import { forgotPassword } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

const ERROR_BY_CODE: Record<string, string> = {
  RATE_LIMITED: forgotPassword.errors.rateLimited,
  VALIDATION_ERROR: forgotPassword.errors.invalidEmail,
};

/**
 * The forgot-password card's body (frame 7:7189 "Forgot password card"
 * 7:7583): heading and intro (7:7600), the email field (7:7603), then the
 * actions (7:7607). Once a link is requested it swaps in place — no new
 * route — to the confirmation, which has no frame and is derived from this
 * one: the field goes, the heading and intro change, and the primary action
 * becomes "Дахин илгээх", resending to the same email.
 */
export default function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The heading is replaced, not navigated to, so move focus onto it for
  // screen readers once the confirmation shows.
  useEffect(() => {
    if (sentTo) headingRef.current?.focus();
  }, [sentTo]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const target = sentTo ?? email.trim();
    if (!isValidLoginEmail(target)) {
      setEmailError(forgotPassword.errors.invalidEmail);
      return;
    }
    setEmailError(undefined);

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok === true) setSentTo(target);
      else setFormError(ERROR_BY_CODE[body?.error] ?? forgotPassword.errors.generic);
    } catch {
      setFormError(forgotPassword.errors.generic);
    }
    setSubmitting(false);
  }

  const { sent } = forgotPassword;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Recovery introduction 7:7600 */}
      <div className="flex flex-col gap-4">
        <AuthHeading ref={headingRef} tabIndex={-1} className="leading-[1.16] outline-none">
          {sentTo ? sent.title : forgotPassword.title}
        </AuthHeading>
        <p className="text-sm leading-[1.55] text-auth-muted">
          {sentTo ? (
            <>
              {sent.intro.beforeEmail}
              <strong className="font-bold text-auth-ink">{sentTo}</strong>
              {sent.intro.afterEmail}
            </>
          ) : (
            forgotPassword.intro
          )}
        </p>
      </div>
      {!sentTo && (
        <AuthField
          label={forgotPassword.emailLabel}
          type="email"
          name="email"
          placeholder={forgotPassword.emailPlaceholder}
          autoComplete="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setEmailError(undefined);
          }}
          error={emailError}
        />
      )}
      {formError && (
        <AuthFormError>
          {formError}
        </AuthFormError>
      )}
      {/* Recovery actions 7:7607 */}
      <div className="flex flex-col items-start gap-5">
        <AuthSubmitButton label={sentTo ? sent.resendLabel : forgotPassword.submitLabel} submitting={submitting} tone="darkHug" />
        <a href={siteConfig.loginUrl} className="text-[13px] font-bold text-auth-link focus-ring">
          {forgotPassword.backLabel}
        </a>
      </div>
    </form>
  );
}
