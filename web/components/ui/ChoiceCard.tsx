import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChoiceCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  /** The step-2 "answer choice" layout: a leading radio dot, left-aligned
   *  text, fixed height (Figma node 1218:13796). Step 1's age/gender/grade
   *  chips (node 1218:13843) have no marker, centre their label, and vary in
   *  height/padding/width per group — so callers supply sizing via
   *  `className` instead of it being a marker-mode default here. */
  marker?: boolean;
}

/**
 * A real `<input type="radio">` wrapped in a styled `<label>` — grouping,
 * arrow-key navigation and screen-reader semantics come from the browser for
 * free. The input is visually hidden (`peer sr-only`); every visual state is
 * driven by conditional class strings (this codebase has no tailwind-merge,
 * so the border/background classes below are written as one mutually
 * exclusive branch rather than layered, possibly-conflicting utilities).
 */
export default function ChoiceCard({ name, value, checked, onChange, children, className, marker }: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center rounded-md transition-[color,background-color,border-color,transform] duration-150 ease-press hover:-translate-y-px active:translate-y-px active:duration-75 focus-ring-within",
        marker ? "h-[clamp(56px,7dvh,72px)] gap-4 px-6 text-left" : "justify-center text-center",
        checked && marker && "border-2 border-accent-question bg-surface-lilac",
        checked && !marker && "border-2 border-brand-blue bg-surface-lilac",
        !checked && marker && "border border-border-choice bg-white",
        !checked && !marker && "border border-border-cyan bg-white",
        className
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
      {marker ? (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[28px] shrink-0 items-center justify-center rounded-full border-2",
            checked ? "border-accent-question" : "border-border-choice bg-white"
          )}
        >
          {checked ? <span className="size-[10px] rounded-full bg-accent-question" /> : null}
        </span>
      ) : null}
      {children}
    </label>
  );
}
