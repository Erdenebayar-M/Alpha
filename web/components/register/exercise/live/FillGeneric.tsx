"use client";

import { diagnostic } from "@/lib/content";
import type { LiveFillProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import AudioPlayButton from "@/components/register/exercise/AudioPlayButton";
import WritingCard from "@/components/register/exercise/live/WritingCard";
import TextWithBlank from "@/components/register/exercise/live/TextWithBlank";
import { useTextEntry } from "@/components/register/exercise/live/useTextEntry";

/**
 * Single-blank fill types not shaped for the picture-based FillLetterTiles
 * renderer (TT_2_4, TT_3_2, TT_4_3, TT_4_4, TT_5_5 — see task-type-map.ts).
 * The backend supplies the answer with no distractor letters, so there is no
 * tile bank to tap from and the letter is typed instead — but the word is
 * still drawn as node 1251:16251 draws it, with a real slot where the missing
 * letter goes, mirroring what the learner writes.
 */
export default function FillGeneric({ task, position, onResult }: LiveExerciseProps<LiveFillProps>) {
  const entry = useTextEntry();

  return (
    <WritingCard
      position={position}
      prompt={task.prompt}
      context={
        <div className="flex w-full flex-col items-center gap-[clamp(12px,2.5dvh,24px)]">
          {task.audioUrl ? <AudioPlayButton src={task.audioUrl} size="sm" /> : null}
          <TextWithBlank text={task.displayText} value={entry.value} scale="word" />
        </div>
      }
      entry={entry}
      placeholder={diagnostic.live.fillPlaceholder}
      hint={diagnostic.live.letterCount(task.blankLength)}
      onNext={onResult}
    />
  );
}
