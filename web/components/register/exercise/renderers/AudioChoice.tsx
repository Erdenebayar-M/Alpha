import type { DiagnosticTask } from "@/lib/diagnostic-tasks";
import AudioPlayButton from "@/components/register/exercise/AudioPlayButton";
import ChoiceExercise from "@/components/register/exercise/ChoiceExercise";
import type { ExerciseProps } from "@/components/register/exercise/types";

type AudioTask = Extract<DiagnosticTask, { form: "audio_choice" }>;

/**
 * Exercise 1 — "Сонсоод зөвийг сонгоорой" (node 1270:22692).
 *
 * The mascot play control, its speech bubble and the audio element it drives
 * all live in AudioPlayButton now — this card was the only place they existed
 * while the flow ran on the fixture, but every live task_type carrying an
 * `audio_url` uses the same control.
 */
export default function AudioChoice({ task, position, total, onResult }: ExerciseProps<AudioTask>) {
  return (
    <ChoiceExercise
      id={task.id}
      position={position}
      total={total}
      prompt={task.prompt}
      choices={task.choices}
      onResult={onResult}
      media={<AudioPlayButton src={task.audioSrc} />}
      className="gap-[clamp(20px,4dvh,28px)]"
      listClassName="flex flex-col gap-4 sm:flex-row"
      cardClassName="flex-1 min-w-0 rounded-tile p-5"
      labelClassName={(checked) =>
        checked
          ? "text-[clamp(20px,4vw,28px)] font-black text-task-accent"
          : "text-[clamp(20px,4vw,28px)] font-bold text-text-label"
      }
    />
  );
}
