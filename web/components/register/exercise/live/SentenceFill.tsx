"use client";

import { diagnostic } from "@/lib/content";
import type { LiveSentenceFillProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import AudioPlayButton from "@/components/register/exercise/AudioPlayButton";
import SentencePanel from "@/components/register/exercise/SentencePanel";
import WritingCard from "@/components/register/exercise/live/WritingCard";
import TextWithBlank from "@/components/register/exercise/live/TextWithBlank";
import { useTextEntry } from "@/components/register/exercise/live/useTextEntry";

/**
 * TT_5_2 and TT_7_5 — write the missing word into a sentence. TT_7_5 is a
 * cloze dictation, so it carries audio; TT_5_2 is read from the page.
 * The blank is the same slot the word-level fill draws, at sentence scale.
 */
export default function SentenceFill({ task, position, onResult }: LiveExerciseProps<LiveSentenceFillProps>) {
  const entry = useTextEntry();

  return (
    <WritingCard
      position={position}
      prompt={task.prompt}
      context={
        <div className="flex w-full flex-col items-center gap-[clamp(12px,2.5dvh,24px)]">
          {task.audioUrl ? <AudioPlayButton src={task.audioUrl} size="sm" /> : null}
          <SentencePanel>
            <TextWithBlank text={task.sentenceTemplate} value={entry.value} scale="sentence" />
          </SentencePanel>
          {task.hint ? <p className="text-sm font-bold text-task-muted">{task.hint}</p> : null}
        </div>
      }
      entry={entry}
      placeholder={diagnostic.live.sentenceFillPlaceholder}
      onNext={onResult}
    />
  );
}
