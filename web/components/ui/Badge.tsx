import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

/** The pill-shaped eyebrow badge used above the hero H1 and section headings.
 *  Figma (node 1202:7474): h-51, px-12 py-7, gap-8, dot 7px, text 16px black. */
export default function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[51px] items-center gap-2 rounded-pill border border-border-soft bg-surface-lilac px-3 py-[7px] text-base font-black text-brand-blue",
        className
      )}
    >
      <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-brand-indigo" />
      {children}
    </span>
  );
}
