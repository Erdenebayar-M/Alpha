"use client";

import { diagnostic } from "@/lib/content";
import type { LiveSelfCheckProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import SentencePanel from "@/components/register/exercise/SentencePanel";
import WritingCard from "@/components/register/exercise/live/WritingCard";
import { useTextEntry } from "@/components/register/exercise/live/useTextEntry";

/**
 * TT_8_4 — compare an earlier attempt against the model answer, then write it
 * corrected. The two panels use the design's own "wrong / right" contrast: the
 * plain task-tile frame for what the child wrote, the accent frame every
 * selected option wears for the model answer.
 */
export default function SelfCheck({ task, position, onResult }: LiveExerciseProps<LiveSelfCheckProps>) {
  const entry = useTextEntry();

  return (
    <WritingCard
      position={position}
      prompt={task.prompt}
      context={
        <div className="flex w-full flex-col gap-3">
          <SentencePanel label={diagnostic.live.selfCheckYours}>
            <p className="text-[clamp(18px,4vw,26px)] font-bold text-task-strong">{task.originalAttempt}</p>
          </SentencePanel>
          <SentencePanel tone="accent" label={diagnostic.live.selfCheckModel}>
            <p className="text-[clamp(18px,4vw,26px)] font-black text-task-accent">{task.modelAnswer}</p>
          </SentencePanel>
        </div>
      }
      entry={entry}
      placeholder={diagnostic.live.selfCheckPlaceholder}
      onNext={onResult}
    />
  );
}
