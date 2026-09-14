import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  /** "pill" (default) is the original eyebrow badge above the homepage H1
   *  and section headings (Figma node 1202:7474): h-51, a rounded-pill
   *  border, a leading dot, 16px black text. "flat" is the landing
   *  redesign's smaller badge (node 1360:8707): h-35, 8px radius, no
   *  border or dot, 18px text on a light-blue fill. */
  variant?: "pill" | "flat";
}

export default function Badge({ children, className, variant = "pill" }: BadgeProps) {
  if (variant === "flat") {
    return (
      <span
        className={cn(
          "inline-flex h-[35px] items-center justify-center rounded-sm bg-hero-badge px-3 py-[6px] text-[18px] text-hero-ink",
          className
        )}
      >
        {children}
      </span>
    );
  }

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
