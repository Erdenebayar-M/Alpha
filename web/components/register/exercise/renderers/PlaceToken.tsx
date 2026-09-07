import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import { cn } from "@/lib/cn";
import TaskCard from "@/components/register/TaskCard";
import { GAP_ATTRIBUTE, usePlacement } from "@/components/register/exercise/usePlacement";
import type { ExerciseProps } from "@/components/register/exercise/types";

type PlaceTask = Extract<DiagnosticTask, { form: "punctuation_place" | "comma_place" }>;

/**
 * Exercises 5 and 6 — "Өгүүлбэрийн төгсгөлийг олж тэмдэглэ" (node 1255:16722)
 * and "Таслалыг хаана, хаана тавих вэ?" (node 1255:16988). One interaction with
 * a different mark, so one renderer under two registry keys.
 *
 * Figma draws a single dashed target because each frame captures one moment:
 * exercise 5 shows it already filled, exercise 6 shows it waiting. In use the
 * learner has to pick *which* gap, so there is a target after every word —
 * drawn as a thin rule until it is the one being aimed at or filled, at which
 * point it becomes the design's dashed ring. Showing all seven rings at full
 * strength at once would read as seven answers rather than one question.
 */
export default function PlaceToken({ task, position, total, onResult }: ExerciseProps<PlaceTask>) {
  const placement = usePlacement();

  return (
    <TaskCard
      position={position}
      total={total}
      prompt={task.prompt}
      canContinue={placement.placedAt !== null}
      onNext={() => onResult(String(placement.placedAt))}
      className="gap-[clamp(24px,5dvh,40px)]"
    >
      <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-3 rounded-panel border border-task-border bg-task-tile px-4 py-5 sm:px-8 sm:py-6">
        {task.words.map((word, index) => {
          const filled = placement.placedAt === index;
          const aimed = placement.hoveredGap === index;
          return (
            <span key={`${word}-${index}`} className="flex items-center gap-2">
              <span className="rounded-[10px] bg-task-chip px-3 py-2 text-[clamp(16px,3.5vw,24px)] font-bold text-task-strong">
                {word}
              </span>
              <button
                type="button"
                {...{ [GAP_ATTRIBUTE]: index }}
                onClick={() => placement.place(index)}
                aria-label={`${word} гэсний ард "${task.token}" тавих`}
                aria-pressed={filled}
                // Fixed footprint in every state, on purpose: growing a target
                // when the token is picked up would reflow the whole sentence
                // mid-drag, sliding the gap the learner is aiming at out from
                // under the pointer. Only the border and fill change.
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-[18px] border-2 border-dashed text-[clamp(14px,3vw,20px)] font-black text-task-strong transition-[background-color,border-color] duration-150 ease-press focus-ring",
                  filled || aimed || placement.targeting
                    ? "border-task-gap bg-white"
                    : "border-task-border/70 hover:border-task-gap hover:bg-white"
                )}
              >
                {filled ? task.token : null}
              </button>
            </span>
          );
        })}
      </div>

      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <button
          type="button"
          {...placement.tokenHandlers}
          aria-label={task.instruction}
          aria-pressed={placement.armed}
          className={cn(
            "flex size-[clamp(64px,12dvh,100px)] shrink-0 touch-none items-center justify-center rounded-full border-2 bg-task-tile text-[clamp(30px,7vw,48px)] leading-none font-black text-task-strong shadow-tile transition-transform duration-150 ease-press focus-ring",
            placement.targeting ? "scale-105 border-task-gap" : "border-task-accent hover:-translate-y-0.5"
          )}
        >
          <span aria-hidden="true">{task.token}</span>
        </button>
        <p className="min-w-0 flex-1 text-center text-base font-bold text-task-strong sm:text-left">
          {task.instruction}
        </p>
      </div>

      <p aria-live="polite" className="sr-only">
        {placement.placedAt === null
          ? ""
          : `"${task.token}" тэмдэг "${task.words[placement.placedAt]}" гэсний ард байна.`}
      </p>
    </TaskCard>
  );
}
