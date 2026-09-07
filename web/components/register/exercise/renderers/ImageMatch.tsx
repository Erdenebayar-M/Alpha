import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import ChoiceExercise from "@/components/register/exercise/ChoiceExercise";
import TaskIllustration from "@/components/register/exercise/TaskIllustration";
import type { ExerciseProps } from "@/components/register/exercise/types";

type ImageTask = Extract<DiagnosticTask, { form: "image_match" }>;

/** Exercise 2 — "Зургийг хараад зөв үгийг сонгоорой" (node 1251:16026). */
export default function ImageMatch({ task, position, total, onResult }: ExerciseProps<ImageTask>) {
  return (
    <ChoiceExercise
      id={task.id}
      position={position}
      total={total}
      prompt={task.prompt}
      choices={task.choices}
      onResult={onResult}
      media={
        <TaskIllustration
          image={task.image}
          className="w-[clamp(160px,44vw,280px)] rounded-card border border-task-border shadow-[0px_4px_10px_rgba(216,227,245,0.25)] [aspect-ratio:1]"
          sizes="(max-width: 640px) 44vw, 280px"
          priority
        />
      }
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
