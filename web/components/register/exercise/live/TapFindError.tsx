"use client";

import { useState } from "react";
import type { LiveTapFindErrorProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import { cn } from "@/lib/cn";
import TaskCard from "@/components/register/TaskCard";
import SentencePanel, { SENTENCE_CHIP } from "@/components/register/exercise/SentencePanel";

/**
 * TT_8_1 — tap the word that has the error. Reports its 0-based index, which
 * is what tapFindErrorDiff compares.
 *
 * Same sentence treatment as the placement exercise (node 1255:16722): word
 * chips in a framed panel. The chips are the tappable thing here rather than
 * the gaps between them, so they carry the design's selected state.
 */
export default function TapFindError({ task, position, onResult }: LiveExerciseProps<LiveTapFindErrorProps>) {
  const [selected, setSelected] = useState<number | null>(null);
  const words = task.sentence.split(/\s+/).filter(Boolean);

  return (
    <TaskCard
      position={position}
      prompt={task.prompt}
      canContinue={selected !== null}
      onNext={() => onResult(String(selected))}
      className="gap-[clamp(24px,5dvh,40px)]"
    >
      <SentencePanel className="flex flex-wrap items-center justify-center gap-2 py-6">
        {words.map((word, index) => (
          <button
            key={`${word}-${index}`}
            type="button"
            onClick={() => setSelected(selected === index ? null : index)}
            aria-pressed={selected === index}
            className={cn(
              SENTENCE_CHIP,
              "border-2 transition-[background-color,border-color,transform] duration-150 ease-press focus-ring",
              selected === index
                ? "border-task-accent bg-task-badge font-black text-task-accent"
                : "border-transparent hover:-translate-y-px active:translate-y-px"
            )}
          >
            {word}
          </button>
        ))}
      </SentencePanel>

      <p aria-live="polite" className="sr-only">
        {selected === null ? "" : `"${words[selected]}" сонгогдлоо.`}
      </p>
    </TaskCard>
  );
}
