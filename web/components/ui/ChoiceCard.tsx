import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChoiceCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
  /** Chrome that applies in both states (size, radius, layout). */
  className?: string;
  /** Chrome that replaces `uncheckedClassName` while selected. */
  checkedClassName?: string;
  uncheckedClassName?: string;
}

/**
 * A real `<input type="radio">` wrapped in a styled `<label>` — grouping,
 * arrow-key navigation and screen-reader semantics come from the browser for
 * free. The input is visually hidden (`peer sr-only`).
 *
 * Only the radio mechanics, focus ring and press feel live here; the selected
 * and unselected skins are supplied per call site, because the register-child
 * design gives its three families of choice control genuinely different
 * treatments — the gender cards (node 1268:18755), the grade pills (1269:20306)
 * and the diagnostic task tiles (1270:22701) share no fill, border or radius.
 * Passing them in as two mutually exclusive class strings (rather than layering
 * overrides) is what this codebase does everywhere: there is no tailwind-merge
 * here, so conflicting utilities would resolve by stylesheet order, not intent.
 */
export default function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  children,
  className,
  checkedClassName,
  uncheckedClassName,
}: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center justify-center text-center transition-[color,background-color,border-color,transform] duration-150 ease-press hover:-translate-y-px active:translate-y-px active:duration-75 focus-ring-within",
        className,
        checked ? checkedClassName : uncheckedClassName
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      {children}
    </label>
  );
}
