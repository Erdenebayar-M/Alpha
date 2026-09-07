import { useState } from "react";
import type { ReactNode } from "react";
import ChoiceCard from "@/components/ui/ChoiceCard";
import TaskCard from "@/components/register/TaskCard";

interface ChoiceExerciseProps {
  id: string;
  position: number;
  total: number;
  prompt: string;
  choices: readonly string[];
  onResult: (answer: string) => void;
  /** Whatever the design puts between the header and the choices. */
  media: ReactNode;
  /** Vertical rhythm of the card, which Figma varies per exercise. */
  className?: string;
  listClassName: string;
  cardClassName: string;
  labelClassName: (checked: boolean) => string;
  checkedClassName?: string;
  uncheckedClassName?: string;
}

/**
 * Four of the nine exercises — 1 (listen), 2 (look), 4 (which mark ends this
 * sentence) and 9 (which spelling starts it) — are one interaction: choose a
 * single option from a row. They differ only in the media above that row and
 * in how big the options are drawn.
 *
 * So they share this component and differ by their registry entry, the same
 * way mobile routes audio_choice, image_match, punctuation_choice and
 * sentence_capital through one `useChoiceExercise`. The style props follow the
 * `listClassName`/`cardClassName` shape this codebase already used for the
 * earlier profile step's choice groups.
 *
 * The choices are a real radio group, so the browser supplies grouping and
 * arrow-key navigation; the visible `<legend>` is the prompt already shown in
 * the card header, hence sr-only here rather than printed twice.
 */
export default function ChoiceExercise({
  id,
  position,
  total,
  prompt,
  choices,
  onResult,
  media,
  className,
  listClassName,
  cardClassName,
  labelClassName,
  checkedClassName = "border-2 border-task-accent bg-task-badge",
  uncheckedClassName = "border border-task-border bg-task-tile",
}: ChoiceExerciseProps) {
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <TaskCard
      position={position}
      total={total}
      prompt={prompt}
      canContinue={answer !== null}
      onNext={() => answer !== null && onResult(answer)}
      className={className}
    >
      {media}

      <fieldset className={`m-0 w-full min-w-0 border-0 p-0 ${listClassName}`}>
        <legend className="sr-only">{prompt}</legend>
        {choices.map((choice) => (
          <ChoiceCard
            key={choice}
            name={id}
            value={choice}
            checked={answer === choice}
            onChange={setAnswer}
            className={cardClassName}
            checkedClassName={checkedClassName}
            uncheckedClassName={uncheckedClassName}
          >
            <span className={labelClassName(answer === choice)}>{choice}</span>
          </ChoiceCard>
        ))}
      </fieldset>
    </TaskCard>
  );
}
