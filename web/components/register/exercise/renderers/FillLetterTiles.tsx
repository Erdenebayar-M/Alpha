import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import { cn } from "@/lib/cn";
import TaskCard from "@/components/register/TaskCard";
import TaskIllustration from "@/components/register/exercise/TaskIllustration";
import { useLetterFill } from "@/components/register/exercise/useLetterFill";
import type { ExerciseProps } from "@/components/register/exercise/types";

type FillTask = Extract<DiagnosticTask, { form: "fill_letter_tiles" }>;

/**
 * Exercise 3 — "Үгийг нөхөх" (node 1251:16251). Letters go into the gaps of a
 * word that is already partly written, so the blanks sit inline in the word
 * rather than in a row of their own (which is exercise 8).
 */
export default function FillLetterTiles({ task, position, total, onResult }: ExerciseProps<FillTask>) {
  // Which blank each segment maps onto, so a segment can read its own letter.
  // Derived up front rather than counted while mapping: a cursor mutated inside
  // the render callback is exactly what react-hooks/immutability rejects, and
  // with five segments the extra scan costs nothing.
  const slotOfSegment = task.segments.map((segment, index) =>
    segment.kind === "blank"
      ? task.segments.slice(0, index).filter((earlier) => earlier.kind === "blank").length
      : null
  );
  const fill = useLetterFill(slotOfSegment.filter((slot) => slot !== null).length);

  return (
    <TaskCard
      position={position}
      total={total}
      prompt={task.prompt}
      canContinue={fill.isComplete}
      onNext={() => onResult(fill.word)}
      className="gap-[clamp(24px,5dvh,49px)]"
    >
      <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:gap-12">
        <TaskIllustration
          image={task.image}
          className="w-[clamp(140px,30vw,200px)] rounded-xl border border-task-border [aspect-ratio:1]"
          sizes="(max-width: 640px) 30vw, 200px"
          priority
        />

        <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
          {task.hint ? <p className="text-base font-bold text-task-muted sm:text-lg">{task.hint}</p> : null}

          <p className="flex flex-wrap items-center gap-2">
            {task.segments.map((segment, index) => {
              if (segment.kind === "text") {
                return (
                  <span key={index} className="text-[clamp(28px,7vw,48px)] font-black text-task-strong">
                    {segment.text}
                  </span>
                );
              }

              const slot = slotOfSegment[index] ?? 0;
              const letter = fill.letters[slot];
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => fill.clearSlot(slot)}
                  disabled={letter === null}
                  aria-label={`${slot + 1}-р нүд${letter === null ? "" : `: ${letter}`}`}
                  className={cn(
                    "flex h-[clamp(40px,8vw,56px)] w-[clamp(32px,6vw,44px)] items-center justify-center rounded-sm border-2 bg-white text-[clamp(20px,4.5vw,32px)] font-black shadow-slot focus-ring",
                    letter === null
                      ? "border-task-border text-task-muted"
                      : "cursor-pointer border-task-accent text-task-accent"
                  )}
                >
                  {letter ?? "_"}
                </button>
              );
            })}
          </p>
        </div>
      </div>

      <div className="flex w-full gap-2 sm:gap-3">
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
                "flex h-[clamp(56px,11dvh,80px)] min-w-0 flex-1 items-center justify-center rounded-tile text-[clamp(22px,5vw,36px)] font-extrabold shadow-tile transition-[background-color,border-color,transform] duration-150 ease-press focus-ring",
                used
                  ? "border-2 border-task-accent bg-task-badge text-task-accent"
                  : "border border-task-border bg-task-tile text-task-strong hover:-translate-y-px active:translate-y-px"
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
