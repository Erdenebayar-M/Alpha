import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import ChoiceExercise from "@/components/register/exercise/ChoiceExercise";
import TaskIllustration from "@/components/register/exercise/TaskIllustration";
import type { ExerciseProps } from "@/components/register/exercise/types";

type CapitalTask = Extract<DiagnosticTask, { form: "sentence_capital" }>;

/** Exercise 9 — "Өгүүлбэр юугаар эхлэх вэ?" (node 1255:17752).
 *
 *  The only one of the four choice exercises whose options sit inside their own
 *  raised panel (node 1255:17763) rather than directly on the card, so it
 *  overrides the shared tile skin with that panel's lighter border. */
export default function SentenceCapital({ task, position, total, onResult }: ExerciseProps<CapitalTask>) {
  const media = (
    <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:gap-10">
      {/* Live TT_6_1 tasks carry no picture (see lib/api/adapt.ts); the
          sentence then takes the whole row. */}
      {task.image ? (
        <TaskIllustration
          image={task.image}
          className="w-[clamp(96px,18vw,120px)] rounded-slot [aspect-ratio:4/3]"
          sizes="(max-width: 640px) 18vw, 120px"
          priority
        />
      ) : null}
      <p className="flex min-w-0 flex-1 flex-col gap-3 text-center text-[clamp(20px,4.5vw,34px)] font-bold text-task-strong sm:text-left">
        {task.sentenceLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
    </div>
  );

  return (
    <ChoiceExercise
      id={task.id}
      position={position}
      total={total}
      prompt={task.prompt}
      choices={task.choices}
      onResult={onResult}
      media={media}
      className="gap-[clamp(20px,4dvh,40px)]"
      listClassName="grid grid-cols-1 gap-4 rounded-2xl border border-border-soft bg-white p-5 shadow-card sm:grid-cols-3 sm:p-9"
      cardClassName="min-h-16 rounded-panel p-5 shadow-[0px_8px_9px_rgba(79,125,255,0.14)]"
      checkedClassName="border-2 border-task-accent bg-task-badge"
      uncheckedClassName="border border-task-image-border bg-task-tile"
      labelClassName={(checked) =>
        checked
          ? "text-[clamp(18px,3.5vw,24px)] leading-tight font-extrabold tracking-[-0.048px] text-task-accent"
          : "text-[clamp(18px,3.5vw,24px)] leading-tight font-extrabold tracking-[-0.048px] text-text-navy"
      }
    />
  );
}
