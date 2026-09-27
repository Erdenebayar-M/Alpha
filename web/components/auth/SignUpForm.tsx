"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import AuthField from "@/components/auth/AuthField";
import AuthFormError from "@/components/auth/AuthFormError";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import ResendConfirmation from "@/components/auth/ResendConfirmation";
import SentToEmail from "@/components/auth/SentToEmail";
import { suggestEmailCorrection } from "@/lib/auth/emailTypoSuggestion";
import { rememberPendingConfirmationEmail } from "@/lib/auth/pendingConfirmationEmail";
import { withNext } from "@/lib/auth/safeNext";
import { validateRegisterForm, type RegisterField, type RegisterFormValues } from "@/lib/auth/registerRules";
import { signUp } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

const EMPTY: RegisterFormValues = { surname: "", name: "", email: "", password: "", confirmPassword: "" };

type FormError = { kind: "duplicateEmail" } | { kind: "message"; text: string };

const ERROR_BY_CODE: Record<string, FormError> = {
  DUPLICATE_EMAIL: { kind: "duplicateEmail" },
  RATE_LIMITED: { kind: "message", text: signUp.errors.rateLimited },
};

/** The sign-up form (frame 7:6344). The password confirmation is checked here
 *  and only here — it is not part of what is sent. `next` is only passed
 *  through, into the Email confirmation link; the confirmation decides
 *  whether it is safe to follow. Once submitted, the form gives way in place
 *  to "check your email", naming the address the link went to. */
export default function SignUpForm({ next }: { next?: string }) {
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegisterField, true>>>({});
  const [formError, setFormError] = useState<FormError>();
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string>();
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Recomputed from whatever is currently typed — accepting it changes the
  // email to the corrected domain, which naturally has no suggestion of its
  // own; ignoring it just leaves it typed as-is, since it never blocks submit.
  const emailSuggestion = useMemo(() => suggestEmailCorrection(values.email), [values.email]);
  // Only true once the form has actually given way to "check your email", so
  // the form isn't stolen focus on first render.
  const wasSent = useRef(false);

  // The form and heading swap in place, not by navigating, so move focus onto
  // whichever one comes forward, for screen readers.
  useEffect(() => {
    if (sentTo) {
      sentHeadingRef.current?.focus();
      wasSent.current = true;
    } else if (wasSent.current) {
      formRef.current?.focus();
    }
  }, [sentTo]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const errors = validateRegisterForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const surname = values.surname.trim();
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: values.email.trim(),
          name: values.name.trim(),
          ...(surname ? { surname } : {}),
          password: values.password,
          next,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && typeof body?.email === "string") {
        rememberPendingConfirmationEmail(body.email);
        setSentTo(body.email);
        return;
      }
      setFormError(ERROR_BY_CODE[body?.error] ?? { kind: "message", text: signUp.errors.generic });
    } catch {
      setFormError({ kind: "message", text: signUp.errors.generic });
    }
    setSubmitting(false);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <h2 ref={sentHeadingRef} tabIndex={-1} className="text-lg font-bold text-auth-ink outline-none">
          {signUp.sent.title}
        </h2>
        <p className="text-sm leading-[1.55] text-auth-muted">
          <SentToEmail copy={signUp.sent.intro} email={sentTo} />
        </p>
        <ResendConfirmation email={sentTo} next={next} />
        <p className="text-sm leading-[1.55] text-auth-muted">
          {signUp.sent.startAgain.label}{" "}
          <button type="button" onClick={() => setSentTo(undefined)} className="font-bold text-auth-link focus-ring">
            {signUp.sent.startAgain.linkLabel}
          </button>
        </p>
      </div>
    );
  }

  return (
    <form noValidate ref={formRef} tabIndex={-1} onSubmit={handleSubmit} className="flex flex-col gap-[18px] outline-none">
      {signUp.fieldGroups.map((group) => (
        <div key={group[0].key} className="flex flex-col gap-2.5">
          {group.map(({ key, ...field }) => (
            <AuthField
              key={key}
              {...field}
              value={values[key]}
              onChange={(value) => {
                setValues((current) => ({ ...current, [key]: value }));
                setFieldErrors((current) => ({ ...current, [key]: undefined, ...(key === "password" ? { confirmPassword: undefined } : {}) }));
              }}
              error={key === "surname" ? undefined : fieldErrors[key] && signUp.errors[key]}
            />
          ))}
          {group[0].key === "email" && emailSuggestion && (
            <p role="status" className="text-xs text-auth-muted">
              {signUp.emailSuggestion.beforeEmail}
              <button
                type="button"
                onClick={() => {
                  setValues((current) => ({ ...current, email: emailSuggestion }));
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
                className="font-bold text-auth-link focus-ring"
              >
                {emailSuggestion}
              </button>
              {signUp.emailSuggestion.afterEmail}
            </p>
          )}
        </div>
      ))}
      {formError && (
        <AuthFormError>
          {formError.kind === "duplicateEmail" ? (
            <>
              {signUp.errors.duplicateEmail}{" "}
              <a href={withNext(siteConfig.loginUrl, next)} className="font-bold text-auth-link focus-ring">
                {signUp.errors.duplicateEmailLinkLabel}
              </a>
            </>
          ) : (
            formError.text
          )}
        </AuthFormError>
      )}
      <AuthSubmitButton label={signUp.submitLabel} submitting={submitting} tone="green" />
    </form>
  );
}
