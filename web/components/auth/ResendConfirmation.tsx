"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import AuthField from "@/components/auth/AuthField";
import AuthFormError from "@/components/auth/AuthFormError";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import { isValidLoginEmail } from "@/lib/auth/loginRules";
import { recallPendingConfirmationEmail } from "@/lib/auth/pendingConfirmationEmail";
import { resendConfirmation } from "@/lib/content";

// How long the button stays disabled after a link is sent, counting down
// on its label. The backend's per-parent cap is the real limit.
const COOLDOWN_SECONDS = 60;

// Storage never changes under the page, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

const ERROR_BY_CODE: Record<string, string> = {
  RATE_LIMITED: resendConfirmation.errors.rateLimited,
  VALIDATION_ERROR: resendConfirmation.errors.invalidEmail,
};

/**
 * "Send me a new confirmation link", with a cooldown before the next one.
 * With `email` — sign-up's "check your email", where a link has just gone to
 * it — the address is fixed and the cooldown runs from the start. Without —
 * the expired-or-used link page — the parent gives the address (prefilled with the
 * one sign-up used in this tab, when there is one) and the cooldown starts once a link is sent. `next` goes into
 * the new link as it did the first.
 */
export default function ResendConfirmation({ email, next }: { email?: string; next?: string }) {
  // What the parent typed; until they do, the address sign-up used in this tab.
  // Storage doesn't exist on the server render, hence the server snapshot.
  const [typed, setTyped] = useState<string>();
  const recalled = useSyncExternalStore(subscribeNever, recallPendingConfirmationEmail, () => "");
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownEnds, setCooldownEnds] = useState(() => (email ? Date.now() + COOLDOWN_SECONDS * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());

  const remaining = Math.max(0, Math.ceil((cooldownEnds - now) / 1000));
  const counting = remaining > 0;

  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    const target = (email ?? typed ?? recalled).trim();
    if (!isValidLoginEmail(target)) {
      setEmailError(resendConfirmation.errors.invalidEmail);
      return;
    }
    setEmailError(undefined);

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: target, next }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok === true) {
        setSent(true);
        setNow(Date.now());
        setCooldownEnds(Date.now() + COOLDOWN_SECONDS * 1000);
      } else {
        setSent(false);
        setFormError(ERROR_BY_CODE[body?.error] ?? resendConfirmation.errors.generic);
      }
    } catch {
      setSent(false);
      setFormError(resendConfirmation.errors.generic);
    }
    setSubmitting(false);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!email && (
        <>
          <p className="text-sm leading-[1.55] text-auth-muted">{resendConfirmation.prompt}</p>
          <AuthField
            label={resendConfirmation.emailLabel}
            type="email"
            name="email"
            placeholder={resendConfirmation.emailPlaceholder}
            autoComplete="email"
            value={typed ?? recalled}
            onChange={(value) => {
              setTyped(value);
              setEmailError(undefined);
            }}
            error={emailError}
          />
        </>
      )}
      {sent && (
        <p role="status" className="text-sm leading-[1.55] text-auth-muted">
          {resendConfirmation.sent}
        </p>
      )}
      {formError && <AuthFormError>{formError}</AuthFormError>}
      <div className="flex flex-col items-start">
        {/* Disabled through the cooldown as while sending, so it takes the same prop. */}
        <AuthSubmitButton
          label={counting ? resendConfirmation.cooldownLabel(remaining) : resendConfirmation.label}
          submitting={submitting || counting}
          tone="darkHug"
        />
      </div>
    </form>
  );
}
