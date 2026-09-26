"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import AuthField from "@/components/auth/AuthField";
import AuthFormError from "@/components/auth/AuthFormError";
import AuthSubmitButton, { AuthActionLink } from "@/components/auth/AuthSubmitButton";
import { AuthHeading } from "@/components/auth/AuthCard";
import { validateNewPassword } from "@/lib/auth/registerRules";
import { resetPassword } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

type Field = (typeof resetPassword.fields)[number]["key"];

const EMPTY: Record<Field, string> = { password: "", confirmPassword: "" };

const ERROR_BY_CODE: Record<string, string> = {
  RATE_LIMITED: resetPassword.errors.rateLimited,
};

// Long enough to read the success message before the redirect replaces it.
const SUCCESS_REDIRECT_DELAY_MS = 1500;

/**
 * The reset-password card's body. No Figma node: derived from frame 7:7189
 * "Forgot password card" 7:7583 — heading and message (7:7600), the fields
 * (7:7603), then the action (7:7607). Three states on one page:
 * - the form, for a link with a token;
 * - success, which signs the parent in and then goes home;
 * - invalid, for an expired, used or unknown link — or none at all — which
 *   offers a new one at /forgot-password.
 * The password confirmation is checked here and only here.
 */
export default function ResetPasswordCard({ token }: { token?: string }) {
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, true>>>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"success" | "invalid" | undefined>(token ? undefined : "invalid");
  const messageRef = useRef<HTMLParagraphElement>(null);

  // The card changes in place, so move focus onto its new message for screen
  // readers — but not on arrival, when the page itself is new.
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (changed) messageRef.current?.focus();
  }, [changed]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const errors = validateNewPassword(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && typeof body?.redirectTo === "string") {
        const { redirectTo } = body;
        setOutcome("success");
        setChanged(true);
        // A full navigation, so the new cookie is on the very next request.
        setTimeout(() => window.location.assign(redirectTo), SUCCESS_REDIRECT_DELAY_MS);
        return;
      }
      if (body?.error === "INVALID_RESET_TOKEN") {
        setOutcome("invalid");
        setChanged(true);
      } else {
        setFormError(ERROR_BY_CODE[body?.error] ?? resetPassword.errors.generic);
      }
    } catch {
      setFormError(resetPassword.errors.generic);
    }
    setSubmitting(false);
  }

  const message = outcome === "success" ? resetPassword.success : outcome === "invalid" ? resetPassword.invalid.message : undefined;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Derived from the recovery introduction 7:7600 */}
      <div className="flex flex-col gap-4">
        <AuthHeading className="leading-[1.16]">{resetPassword.title}</AuthHeading>
        {message && (
          <p ref={messageRef} tabIndex={-1} role="status" className="text-sm leading-[1.55] text-auth-muted outline-none">
            {message}
          </p>
        )}
      </div>
      {!outcome && (
        <>
          {/* Derived from the email field 7:7603 */}
          <div className="flex flex-col gap-[18px]">
            {resetPassword.fields.map(({ key, ...field }) => (
              <AuthField
                key={key}
                {...field}
                value={values[key]}
                onChange={(value) => {
                  setValues((current) => ({ ...current, [key]: value }));
                  setFieldErrors((current) => ({ ...current, [key]: undefined, ...(key === "password" ? { confirmPassword: undefined } : {}) }));
                }}
                error={fieldErrors[key] && resetPassword.errors[key]}
              />
            ))}
          </div>
          {formError && <AuthFormError>{formError}</AuthFormError>}
          {/* Derived from the recovery actions 7:7607 */}
          <div className="flex flex-col items-start">
            <AuthSubmitButton label={resetPassword.submitLabel} submitting={submitting} tone="darkHug" />
          </div>
        </>
      )}
      {outcome === "invalid" && (
        <div className="flex flex-col items-start">
          <AuthActionLink label={resetPassword.invalid.actionLabel} href={siteConfig.forgotPasswordUrl} tone="darkHug" />
        </div>
      )}
    </form>
  );
}
