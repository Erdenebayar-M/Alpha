"use client";

import { useState, type FormEvent } from "react";
import AuthField from "@/components/auth/AuthField";
import AuthFormError from "@/components/auth/AuthFormError";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import ResendConfirmation from "@/components/auth/ResendConfirmation";
import { isValidLoginEmail } from "@/lib/auth/loginRules";
import { signIn } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

const ERROR_BY_CODE: Record<string, string> = {
  INVALID_CREDENTIALS: signIn.errors.invalidCredentials,
  RATE_LIMITED: signIn.errors.rateLimited,
  VALIDATION_ERROR: signIn.errors.invalidEmail,
};

/** The email/password form (frame 7:4257 "Credentials" 7:6129). `next` is only
 *  passed along — the route handler decides whether it is safe to follow. */
export default function SignInForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  // Set when the right password met an unconfirmed account: the address the
  // parent typed (Resend needs it whole) and its masked form for the message.
  const [unconfirmed, setUnconfirmed] = useState<{ email: string; masked: string }>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);
    setUnconfirmed(undefined);

    const trimmedEmail = email.trim();
    if (!isValidLoginEmail(trimmedEmail)) {
      setEmailError(signIn.errors.invalidEmail);
      return;
    }
    setEmailError(undefined);

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password, next }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && typeof body?.redirectTo === "string") {
        // A full navigation, so the new cookie is on the very next request.
        window.location.assign(body.redirectTo);
        return;
      }
      if (body?.error === "EMAIL_NOT_CONFIRMED" && typeof body.maskedEmail === "string") {
        setUnconfirmed({ email: trimmedEmail, masked: body.maskedEmail });
      } else {
        setFormError(ERROR_BY_CODE[body?.error] ?? signIn.errors.generic);
      }
    } catch {
      setFormError(signIn.errors.generic);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
        <AuthField
          label={signIn.emailLabel}
          type="email"
          name="email"
          placeholder={signIn.emailPlaceholder}
          autoComplete="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
          // The notice and Resend belong to the address that was submitted.
          setUnconfirmed(undefined);
            setEmailError(undefined);
          }}
          error={emailError}
        />
        <AuthField
          label={signIn.passwordLabel}
          labelAction={
            <a href={siteConfig.forgotPasswordUrl} className="text-xs leading-[31px] text-auth-link focus-ring">
              {signIn.forgotPasswordLabel}
            </a>
          }
          type="password"
          name="password"
          placeholder={signIn.passwordPlaceholder}
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        {formError && (
          <AuthFormError>
            {formError}
          </AuthFormError>
        )}
        <AuthSubmitButton label={signIn.submitLabel} submitting={submitting} />
      </form>
      {/* Outside the form: Resend is a form of its own. */}
      {unconfirmed && (
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-sm leading-[1.55] text-auth-muted">
            {signIn.confirmFirst(unconfirmed.masked)}
          </p>
          <ResendConfirmation email={unconfirmed.email} next={next} coolDownFirst={false} />
        </div>
      )}
    </div>
  );
}
