import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * One word chip inside a sentence panel — the skin Figma draws on the words of
 * the punctuation-placement card (node 1255:16730). Exported as a constant
 * because three live screens need the same chip without sharing a component:
 * they wrap it in a `<span>`, a `<button>` and a `<li>` respectively.
 */
export const SENTENCE_CHIP =
  "rounded-[10px] bg-task-chip px-3 py-2 text-[clamp(16px,3.5vw,24px)] font-bold text-task-strong";

interface SentencePanelProps {
  children: ReactNode;
  /** `accent` is the "this is the right answer" treatment the self-check
   *  screen puts on the model answer, matching the selected-option idiom
   *  used across the designed cards. */
  tone?: "default" | "accent";
  /** Small caption above the text, e.g. "Таны хариу". */
  label?: string;
  className?: string;
}

/**
 * The framed panel that holds whatever text a task asks the learner to read —
 * a word to copy, a sentence to correct, the model answer to compare against.
 *
 * The skin is taken from the two panels the design already draws: the sentence
 * card on the punctuation-choice exercise (node 1254:16502) and the sentence
 * frame on the placement exercises (node 1255:16722), which are the same
 * rounded-panel/task-border/task-tile treatment at different paddings. The
 * live diagnostic needs it on eight more screens that have no Figma node of
 * their own (see lib/api/task-type-map.ts), so it lives here rather than being
 * retyped per renderer.
 *
 * The two Figma renderers keep their own hand-built panels: their padding and
 * type scale are drawn per card, and rewriting them through this component
 * would change their DOM for no gain.
 */
export default function SentencePanel({ children, tone = "default", label, className }: SentencePanelProps) {
  return (
    <div
      className={cn(
        "w-full rounded-panel border px-4 py-5 sm:px-8",
        tone === "accent" ? "border-task-accent bg-task-badge" : "border-task-border bg-task-tile",
        className
      )}
    >
      {label ? (
        <p
          className={cn(
            "mb-1.5 text-xs font-black uppercase",
            tone === "accent" ? "text-task-accent" : "text-task-muted"
          )}
        >
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}
