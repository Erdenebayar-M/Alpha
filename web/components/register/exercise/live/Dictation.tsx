"use client";

import { diagnostic } from "@/lib/content";
import type { LiveDictationProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import AudioPlayButton from "@/components/register/exercise/AudioPlayButton";
import WritingCard from "@/components/register/exercise/live/WritingCard";
import { useTextEntry } from "@/components/register/exercise/live/useTextEntry";

/**
 * dictationOptions (TT_7_3 word, TT_7_4 sentence) and miniTextOptions
 * (TT_7_6, a short passage) — hear audio, write what was said. The backend
 * compares word-by-word (answer-checker.ts's dictationDiff), so the answer is
 * the plain typed text; `multiline` only changes the field's size, not the
 * wire format.
 *
 * These are the single most-served task types in a real diagnostic, so the
 * audio is the designed mascot control rather than a browser audio bar.
 */
export default function Dictation({ task, position, onResult }: LiveExerciseProps<LiveDictationProps>) {
  const entry = useTextEntry();

  return (
    <WritingCard
      position={position}
      prompt={task.prompt}
      context={
        task.audioUrl ? (
          <AudioPlayButton src={task.audioUrl} size="sm" />
        ) : (
          <p className="text-sm font-bold text-task-muted">{diagnostic.live.audioMissing}</p>
        )
      }
      entry={entry}
      placeholder={diagnostic.live.dictationPlaceholder}
      hint={
        task.unit === "sentence"
          ? diagnostic.live.sentenceCount(task.count)
          : diagnostic.live.wordCount(task.count)
      }
      multiline={task.multiline}
      onNext={onResult}
    />
  );
}
