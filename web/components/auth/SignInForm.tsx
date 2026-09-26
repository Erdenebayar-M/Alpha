"use client";

import { useState, type FormEvent } from "react";
import AuthField from "@/components/auth/AuthField";
import AuthFormError from "@/components/auth/AuthFormError";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

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
      setFormError(ERROR_BY_CODE[body?.error] ?? signIn.errors.generic);
    } catch {
      setFormError(signIn.errors.generic);
    }
    setSubmitting(false);
  }

  return (
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
  );
}
