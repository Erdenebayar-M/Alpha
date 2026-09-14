"use client";

import type { LiveChoiceProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import AudioPlayButton from "@/components/register/exercise/AudioPlayButton";
import ChoiceExercise from "@/components/register/exercise/ChoiceExercise";
import SentencePanel from "@/components/register/exercise/SentencePanel";
import TaskIllustration from "@/components/register/exercise/TaskIllustration";
import TextWithBlank from "@/components/register/exercise/live/TextWithBlank";

/**
 * The choiceOptions task_types with no bespoke Figma renderer (see
 * task-type-map.ts). Reuses the same ChoiceExercise shell the fixture's
 * AudioChoice/ImageMatch/etc. wrap, picking whatever media the task actually
 * carries — a picture, the mascot play control, the sentence being completed,
 * or nothing. A task with audio gets exactly what exercise 1 gets, since that
 * is what the design says "listen to this" looks like.
 *
 * When the task is a cloze sentence (lib/api/adapt.ts lifts it out of the
 * prompt), the sentence goes in the panel the punctuation card uses and its
 * blank fills in with the option currently chosen — so the learner reads the
 * sentence they are actually building, rather than judging three words in
 * isolation against small print in the header.
 */
export default function ChoiceGeneric({ task, position, onResult }: LiveExerciseProps<LiveChoiceProps>) {
  const asset = task.imageUrl ? (
    <TaskIllustration
      image={{ src: task.imageUrl, alt: task.prompt }}
      className="w-[clamp(160px,44vw,280px)] rounded-card border border-task-border [aspect-ratio:1] shadow-[0px_4px_10px_rgba(216,227,245,0.25)]"
      sizes="(max-width: 640px) 44vw, 280px"
      priority
    />
  ) : task.audioUrl ? (
    <AudioPlayButton src={task.audioUrl} />
  ) : null;

  const media =
    task.sentence === null
      ? asset
      : (selected: string | null) => (
          <div className="flex w-full flex-col items-center gap-[clamp(16px,3dvh,28px)]">
            {asset}
            <SentencePanel>
              <TextWithBlank text={task.sentence ?? ""} value={selected ?? ""} scale="sentence" />
            </SentencePanel>
          </div>
        );

  return (
    <ChoiceExercise
      id={`live-${position}`}
      position={position}
      prompt={task.prompt}
      choices={task.choices}
      onResult={onResult}
      media={media}
      className="gap-[clamp(20px,4dvh,32px)]"
      listClassName="flex flex-col gap-4 sm:flex-row"
      cardClassName="flex-1 min-w-0 rounded-tile p-5"
      labelClassName={(checked) =>
        checked
          ? "text-[clamp(20px,4vw,26px)] font-black text-task-accent"
          : "text-[clamp(20px,4vw,26px)] font-bold text-task-strong"
      }
    />
  );
}
