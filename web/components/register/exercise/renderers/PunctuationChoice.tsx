import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import ChoiceExercise from "@/components/register/exercise/ChoiceExercise";
import TaskIllustration from "@/components/register/exercise/TaskIllustration";
import type { ExerciseProps } from "@/components/register/exercise/types";

type PunctuationTask = Extract<DiagnosticTask, { form: "punctuation_choice" }>;

/** Exercise 4 — "Өгүүлбэр дуусахад ямар тэмдэг тавих вэ?" (node 1254:16502). */
export default function PunctuationChoice({ task, position, total, onResult }: ExerciseProps<PunctuationTask>) {
  const media = (
    <>
      {/* Live TT_6_2 tasks carry no picture (see lib/api/adapt.ts); the
          sentence panel below is this card's subject either way. */}
      {task.image ? (
        <TaskIllustration
          image={task.image}
          className="w-[clamp(120px,22vw,168px)] rounded-sm [aspect-ratio:168/140]"
          sizes="(max-width: 640px) 22vw, 168px"
          priority
        />
      ) : null}
      {/* The sentence card is drawn 720px wide inside a card whose content box
          is 684px — it deliberately breaks the padding by 18px a side. */}
      <p className="w-full rounded-panel border border-task-border bg-task-tile px-4 py-6 text-center text-[clamp(18px,4vw,32px)] font-bold text-task-strong sm:-mx-[18px] sm:w-[calc(100%+36px)] sm:px-8">
        {task.sentence}
      </p>
    </>
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
      className="gap-[clamp(18px,3.5dvh,30px)]"
      listClassName="flex gap-3 sm:gap-6"
      cardClassName="h-[clamp(72px,14dvh,120px)] flex-1 min-w-0 rounded-panel shadow-tile"
      labelClassName={(checked) =>
        checked
          ? "text-[clamp(28px,7vw,52px)] leading-none font-extrabold text-task-accent"
          : "text-[clamp(28px,7vw,52px)] leading-none font-extrabold text-task-strong"
      }
    />
  );
}
