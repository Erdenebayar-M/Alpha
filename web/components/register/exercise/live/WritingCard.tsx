"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import TaskCard from "@/components/register/TaskCard";
import type { TextEntry } from "@/components/register/exercise/live/useTextEntry";

interface WritingCardProps {
  position: number;
  prompt: string;
  /** Whatever the exercise shows above the field — a word with a gap, a
   *  sentence to fix, the mascot play button, a pair of texts to compare. */
  context: ReactNode;
  entry: TextEntry;
  placeholder: string;
  /** The one-line expectation under the field: "3 үг", "2 өгүүлбэр", "4 үсэг". */
  hint?: ReactNode;
  multiline?: boolean;
  onNext: (answer: string) => void;
  className?: string;
}

/**
 * The shared card for every live task that is fundamentally "show context,
 * write an answer": dictation, mini-text, copy-write, visual memory,
 * correction, self-check, and the two fill families.
 *
 * These are the diagnostic's highest-traffic screens — the adaptive engine
 * prefers TT_7_x/TT_8_x items over every other candidate at a rung (see
 * backend/src/lib/engines/diagnostic-adaptive.ts's selectNextItem) — and none
 * of them has a Figma node, because the nine designed cards are all choice,
 * tile, match or placement exercises with no text entry anywhere. So the field
 * is built from the design's own vocabulary rather than invented: the same
 * rounded-panel frame the sentence panels use, and the design's universal
 * "answered" idiom — a task-border outline that becomes a task-accent one, with
 * the value itself in task-accent — which is what a filled letter slot does on
 * node 1251:16251. Flagged for design review with the rest of the live screens.
 */
export default function WritingCard({
  position,
  prompt,
  context,
  entry,
  placeholder,
  hint,
  multiline,
  onNext,
  className,
}: WritingCardProps) {
  const Field = multiline ? "textarea" : "input";
  const filled = entry.isComplete;

  return (
    <TaskCard
      position={position}
      prompt={prompt}
      canContinue={filled}
      onNext={() => onNext(entry.value)}
      className={cn("gap-[clamp(20px,4dvh,36px)]", className)}
    >
      <div className="flex w-full flex-col items-center gap-[clamp(16px,3dvh,28px)]">
        {context}

        <div className="flex w-full flex-col items-center gap-2">
          <Field
            value={entry.value}
            placeholder={placeholder}
            rows={multiline ? 4 : undefined}
            // Mongolian orthography is the thing being measured — the browser
            // must not quietly fix it on the learner's behalf.
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              entry.setValue(event.target.value)
            }
            className={cn(
              "w-full min-w-0 resize-none rounded-panel border-2 px-5 py-4 text-center text-[clamp(20px,4.5vw,30px)] font-black shadow-tile transition-[background-color,border-color] duration-150 ease-press placeholder:font-bold placeholder:text-task-muted focus-ring",
              multiline && "text-left",
              filled
                ? "border-task-accent bg-white text-task-accent"
                : "border-task-border bg-task-tile text-task-strong"
            )}
          />

          {hint ? <p className="text-sm font-bold text-task-muted">{hint}</p> : null}
        </div>
      </div>
    </TaskCard>
  );
}
