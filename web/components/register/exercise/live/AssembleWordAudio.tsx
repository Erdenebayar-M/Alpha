"use client";

import type { LiveAssembleAudioProps } from "@/lib/api/adapt";
import type { LiveExerciseProps } from "@/components/register/exercise/live/types";
import { cn } from "@/lib/cn";
import TaskCard from "@/components/register/TaskCard";
import AudioPlayButton from "@/components/register/exercise/AudioPlayButton";
import { useLetterFill } from "@/components/register/exercise/useLetterFill";

/**
 * TT_2_2 — hear the word, tap the scrambled tiles into order. The audio
 * sibling of the fixture's AssembleWord.tsx (which shows a picture instead);
 * kept as its own component rather than an added prop on AssembleWord since
 * that file's shape is untouched by this change (see task-type-map.ts).
 * Reuses the same useLetterFill hook AssembleWord and FillLetterTiles do.
 */
export default function AssembleWordAudio({ task, position, onResult }: LiveExerciseProps<LiveAssembleAudioProps>) {
  const fill = useLetterFill(task.slotCount);

  return (
    <TaskCard
      position={position}
      prompt={task.prompt}
      canContinue={fill.isComplete}
      onNext={() => onResult(fill.word)}
      className="gap-8"
    >
      {task.audioUrl ? <AudioPlayButton src={task.audioUrl} size="sm" /> : null}

      <div className="flex flex-wrap gap-2">
        {fill.letters.map((letter, slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => fill.clearSlot(slot)}
            disabled={letter === null}
            aria-label={`${slot + 1}-р нүд${letter === null ? "" : `: ${letter}`}`}
            className={cn(
              "flex h-[clamp(52px,10vw,72px)] w-[clamp(46px,9vw,64px)] items-center justify-center rounded-slot border-2 border-dashed text-[clamp(20px,4.5vw,28px)] focus-ring",
              letter === null
                ? "border-task-border bg-task-tile font-bold text-task-muted"
                : "cursor-pointer border-task-accent bg-white font-black text-task-accent"
            )}
          >
            {letter ?? "_"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {task.tiles.map((tile, index) => {
          const used = fill.usedTiles.has(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => fill.place(index, tile)}
              disabled={used || fill.isComplete}
              aria-label={tile}
              className={cn(
                "flex size-[clamp(46px,9vw,64px)] items-center justify-center rounded-tile bg-white text-[clamp(20px,4.5vw,28px)] font-extrabold text-task-strong transition-transform duration-150 ease-press focus-ring",
                used
                  ? "border border-task-border opacity-40"
                  : "shadow-tile-loose hover:-translate-y-px active:translate-y-px"
              )}
            >
              {tile}
            </button>
          );
        })}
      </div>
    </TaskCard>
  );
}
