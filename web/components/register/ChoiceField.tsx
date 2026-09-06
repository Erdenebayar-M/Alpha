import type { ReactNode } from "react";
import ChoiceCard from "@/components/ui/ChoiceCard";

export interface ChoiceFieldOption {
  readonly value: string;
  readonly label: ReactNode;
}

interface ChoiceFieldProps {
  legend: string;
  name: string;
  delayMs: number;
  listClassName: string;
  cardClassName: string;
  options: readonly ChoiceFieldOption[];
  selected: string | null;
  onChange: (value: string) => void;
}

/** One age/gender/grade group of step 1 in the register-child flow (Figma
 *  node 1218:13843): a legend plus a row/grid of ChoiceCards, staggered in
 *  with the rest of the step. `listClassName`/`cardClassName` let each
 *  group keep its own layout (grid vs flex, sizing) since Figma varies them
 *  per group rather than sharing one. */
export default function ChoiceField({
  legend,
  name,
  delayMs,
  listClassName,
  cardClassName,
  options,
  selected,
  onChange,
}: ChoiceFieldProps) {
  return (
    <fieldset
      className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0 lg:pl-[43px]"
      style={{ "--delay": `${delayMs}ms` } as React.CSSProperties}
    >
      <legend className="animate-rise-in p-0 text-xl font-extrabold text-text-label [animation-delay:var(--delay)]">
        {legend}
      </legend>
      <div className={`animate-rise-in [animation-delay:var(--delay)] ${listClassName}`}>
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            name={name}
            value={option.value}
            checked={selected === option.value}
            onChange={onChange}
            className={cardClassName}
          >
            {option.label}
          </ChoiceCard>
        ))}
      </div>
    </fieldset>
  );
}
