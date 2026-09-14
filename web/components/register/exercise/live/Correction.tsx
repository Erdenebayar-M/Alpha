"use client";

import { diagnostic } from "@/lib/content";
import type { LiveCorrectionProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import SentencePanel, { SENTENCE_CHIP } from "@/components/register/exercise/SentencePanel";
import WritingCard from "@/components/register/exercise/live/WritingCard";
import { useTextEntry } from "@/components/register/exercise/live/useTextEntry";

/**
 * The correctionOptions types that stay free-text (TT_2_5, TT_2_6, TT_3_5,
 * TT_4_5, TT_8_2) — read the wrong text, write the fixed version. The two
 * punctuation ones (TT_6_3, TT_6_4) are the placement exercise instead; see
 * lib/api/task-type-map.ts.
 *
 * The wrong text is shown as word chips, the same way the placement card draws
 * a sentence (node 1255:16722), so a multi-word sentence stays readable as
 * separate words the child can compare against what they type. The field is
 * deliberately not pre-filled with it: this is a diagnostic, and a pre-filled
 * answer can be submitted unchanged by a tap.
 */
export default function Correction({ task, position, onResult }: LiveExerciseProps<LiveCorrectionProps>) {
  const entry = useTextEntry();
  const words = task.incorrectText.split(/\s+/).filter(Boolean);

  return (
    <WritingCard
      position={position}
      prompt={task.prompt}
      context={
        <SentencePanel className="flex flex-wrap items-center justify-center gap-2">
          {words.map((word, index) => (
            <span key={`${word}-${index}`} className={SENTENCE_CHIP}>
              {word}
            </span>
          ))}
        </SentencePanel>
      }
      entry={entry}
      placeholder={diagnostic.live.correctionPlaceholder}
      multiline={words.length > 6}
      onNext={onResult}
    />
  );
}
