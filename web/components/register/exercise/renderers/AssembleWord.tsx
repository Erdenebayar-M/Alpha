import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import { cn } from "@/lib/cn";
import TaskCard from "@/components/register/TaskCard";
import TaskIllustration from "@/components/register/exercise/TaskIllustration";
import { useLetterFill } from "@/components/register/exercise/useLetterFill";
import type { ExerciseProps } from "@/components/register/exercise/types";

type AssembleTask = Extract<DiagnosticTask, { form: "assemble_word" }>;

/**
 * Exercise 8 — "Зургийг ажиглаад үг бүтээгээрэй" (node 1255:17489). The whole
 * word is built from an empty row of slots, and every tile is spent, so used
 * tiles fade out of the bank rather than lighting up as they do in exercise 3.
 */
export default function AssembleWord({ task, position, total, onResult }: ExerciseProps<AssembleTask>) {
  const fill = useLetterFill(task.slotCount);

  return (
    <TaskCard
      position={position}
      total={total}
      prompt={task.prompt}
      canContinue={fill.isComplete}
      onNext={() => onResult(fill.word)}
      className="gap-[clamp(24px,5dvh,50px)]"
    >
      <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:gap-12">
        <TaskIllustration
          image={task.image}
          className="w-[clamp(140px,30vw,200px)] rounded-card border border-task-image-border shadow-[0px_4px_10px_rgba(216,227,245,0.25)] [aspect-ratio:1]"
          sizes="(max-width: 640px) 30vw, 200px"
          priority
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6 sm:gap-10">
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

          {task.hint ? <p className="text-sm text-task-muted">{task.hint}</p> : null}

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
        </div>
      </div>
    </TaskCard>
  );
}
