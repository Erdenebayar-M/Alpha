"use client";

import { diagnostic } from "@/lib/content";
import type { LiveCopyTextProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import SentencePanel from "@/components/register/exercise/SentencePanel";
import WritingCard from "@/components/register/exercise/live/WritingCard";
import { useTextEntry } from "@/components/register/exercise/live/useTextEntry";

/** TT_7_1 — copy the shown text exactly. The grade-1 diagnostic's most-served
 *  task type, since it is the only "rich" item authored at that rung. */
export default function CopyText({ task, position, onResult }: LiveExerciseProps<LiveCopyTextProps>) {
  const entry = useTextEntry();

  return (
    <WritingCard
      position={position}
      prompt={task.prompt}
      context={
        <SentencePanel>
          <p className="text-center text-[clamp(24px,5.5vw,40px)] font-black text-task-strong">{task.textToCopy}</p>
        </SentencePanel>
      }
      entry={entry}
      placeholder={diagnostic.live.copyPlaceholder}
      onNext={onResult}
    />
  );
}
