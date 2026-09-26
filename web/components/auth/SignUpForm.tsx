"use client";

import { useState, type FormEvent } from "react";
import AuthField from "@/components/auth/AuthField";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
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
 *  and only here — it is not part of what is sent. */
export default function SignUpForm() {
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegisterField, true>>>({});
  const [formError, setFormError] = useState<FormError>();
  const [submitting, setSubmitting] = useState(false);

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
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && typeof body?.redirectTo === "string") {
        // A full navigation, so the new cookie is on the very next request.
        window.location.assign(body.redirectTo);
        return;
      }
      setFormError(ERROR_BY_CODE[body?.error] ?? { kind: "message", text: signUp.errors.generic });
    } catch {
      setFormError({ kind: "message", text: signUp.errors.generic });
    }
    setSubmitting(false);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {signUp.fields.map(({ key, ...field }) => (
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
      {formError && (
        <p role="alert" className="-mt-2 text-xs text-[color:var(--color-palette-red)]">
          {formError.kind === "duplicateEmail" ? (
            <>
              {signUp.errors.duplicateEmail}{" "}
              <a href={siteConfig.loginUrl} className="font-bold text-auth-link focus-ring">
                {signUp.errors.duplicateEmailLinkLabel}
              </a>
            </>
          ) : (
            formError.text
          )}
        </p>
      )}
      <AuthSubmitButton label={signUp.submitLabel} submitting={submitting} tone="green" />
    </form>
  );
}
