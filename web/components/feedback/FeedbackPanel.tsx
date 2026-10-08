"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { feedback as copy } from "@/lib/content";
import { FEEDBACK_TEXT_MAX } from "@/lib/feedback/input";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; issueNumber: number }
  | { kind: "error"; message: string };

type ErrorCode = keyof typeof copy.errors;

// The two inputs are the same control with a different element; the label
// sits above each the same way.
const labelClass = "text-sm font-extrabold text-text-label";
const controlClass = "w-full rounded-xl border border-border-card bg-white p-3 text-sm text-text-nav-strong focus-ring";

/**
 * The dev site's floating feedback button and its form, in a native modal
 * <dialog> (focus trap and Esc for free). Sends the text, an optional Figma
 * link and the page's address and viewport to app/api/feedback, which files the
 * GitHub issue. Only rendered by FeedbackWidget when the widget is enabled.
 */
export default function FeedbackPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const ids = { title: useId(), text: useId(), figma: useId(), hint: useId() };

  function open() {
    if (status.kind !== "sending") setStatus({ kind: "idle" });
    dialogRef.current?.showModal();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          figmaUrl,
          // No query or hash: they can carry a live token (/reset-password?token=…).
          pageUrl: window.location.origin + window.location.pathname,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { issueNumber?: number; error?: string };
      if (res.ok && typeof json.issueNumber === "number") {
        setStatus({ kind: "sent", issueNumber: json.issueNumber });
        setText("");
        setFigmaUrl("");
        return;
      }
      const code = (json.error ?? "UPSTREAM_ERROR") as ErrorCode;
      setStatus({ kind: "error", message: copy.errors[code] ?? copy.errors.UPSTREAM_ERROR });
    } catch {
      setStatus({ kind: "error", message: copy.errors.UPSTREAM_ERROR });
    }
  }

  const sending = status.kind === "sending";

  return (
    <div data-feedback-widget>
      <button
        type="button"
        onClick={open}
        className="fixed right-4 bottom-4 z-40 rounded-full bg-brand-blue px-4 py-3 text-sm font-extrabold text-white shadow-card hover:brightness-105 focus-ring"
      >
        {copy.openLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={ids.title}
        className="m-auto w-[calc(100%-32px)] max-w-[480px] rounded-2xl border border-border-card bg-white p-0 text-text-nav-strong shadow-card backdrop:bg-text-nav-strong/40"
      >
        <form onSubmit={submit} className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={ids.title} className="text-lg font-black">
              {copy.title}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={copy.closeLabel}
              className="-m-2 rounded-full p-2 text-xl leading-none text-text-nav focus-ring"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p className="text-sm text-text-nav">{copy.intro}</p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.text} className={labelClass}>
              {copy.textLabel}
            </label>
            <textarea
              id={ids.text}
              value={text}
              onChange={(event) => setText(event.target.value)}
              required
              maxLength={FEEDBACK_TEXT_MAX}
              rows={5}
              className={`${controlClass} resize-y`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.figma} className={labelClass}>
              {copy.figmaLabel}
            </label>
            <input
              id={ids.figma}
              type="url"
              inputMode="url"
              value={figmaUrl}
              onChange={(event) => setFigmaUrl(event.target.value)}
              placeholder={copy.figmaPlaceholder}
              aria-describedby={ids.hint}
              className={controlClass}
            />
            <p id={ids.hint} className="text-xs text-text-nav">
              {copy.figmaHint}
            </p>
          </div>

          <div aria-live="polite">
            {status.kind === "sent" && <p className="text-sm font-bold text-brand-blue">{copy.sent(status.issueNumber)}</p>}
            {status.kind === "error" && (
              <p role="alert" className="text-sm text-form-error">
                {status.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-brand-blue px-4 py-3 text-sm font-extrabold text-white focus-ring disabled:opacity-60"
          >
            {sending ? copy.sendingLabel : copy.submitLabel}
          </button>
        </form>
      </dialog>
    </div>
  );
}
