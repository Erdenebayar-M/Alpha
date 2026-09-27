"use client";

import { useEffect, useRef, useState } from "react";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import { confirmEmail } from "@/lib/content";

type Outcome = { kind: "confirming" } | { kind: "invalid" } | { kind: "failed"; message: string };

const ERROR_BY_CODE: Record<string, string> = {
  RATE_LIMITED: confirmEmail.errors.rateLimited,
};

/**
 * The Email confirmation page's body. It confirms on arrival — the link is the
 * whole action — and, once the parent is signed in, moves on to where the
 * route handler says. Confirming from the page's script rather than on the
 * GET keeps mail scanners that fetch links from using the token up. Three
 * states: confirming; invalid, for an expired, used or unknown link (or none);
 * and failed, for a backend error, which can be retried.
 */
export default function ConfirmEmailCard({ token, next }: { token?: string; next?: string }) {
  const [outcome, setOutcome] = useState<Outcome>(token ? { kind: "confirming" } : { kind: "invalid" });
  // A link works once: never send it twice, including from Strict Mode's
  // second effect run in development.
  const sent = useRef(false);

  async function confirm() {
    setOutcome({ kind: "confirming" });
    try {
      const res = await fetch("/api/auth/confirm-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, next }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && typeof body?.redirectTo === "string") {
        // A full navigation, so the new cookie is on the very next request.
        window.location.assign(body.redirectTo);
        return;
      }
      setOutcome(
        body?.error === "INVALID_CONFIRMATION_TOKEN"
          ? { kind: "invalid" }
          : { kind: "failed", message: ERROR_BY_CODE[body?.error] ?? confirmEmail.errors.generic },
      );
    } catch {
      setOutcome({ kind: "failed", message: confirmEmail.errors.generic });
    }
  }

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    void confirm();
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const message = outcome.kind === "confirming" ? confirmEmail.confirming : outcome.kind === "invalid" ? confirmEmail.invalid : outcome.message;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void confirm();
      }}
      className="flex flex-col gap-6"
    >
      <p role={outcome.kind === "failed" ? "alert" : "status"} className="text-sm leading-[1.55] text-auth-muted">
        {message}
      </p>
      {outcome.kind === "failed" && (
        <div className="flex flex-col items-start">
          <AuthSubmitButton label={confirmEmail.retryLabel} submitting={false} tone="darkHug" />
        </div>
      )}
    </form>
  );
}
