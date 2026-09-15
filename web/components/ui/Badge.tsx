import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FlatBadgeVariant = "flat" | "lilac";
type BadgeVariant = "pill" | FlatBadgeVariant;

interface BadgeProps {
  children: ReactNode;
  className?: string;
  /** "pill" (default) is the original eyebrow badge above the homepage H1
   *  and section headings (Figma node 1202:7474): h-51, a rounded-pill
   *  border, a leading dot, 16px black text. "flat" is the landing
   *  redesign's hero badge (node 1360:8707): h-35, 8px radius, no border or
   *  dot, 18px text on a light-blue fill. "lilac" is the same flat chrome
   *  at the Diagnostic card's smaller size (node 1401:21883): h-30 on a
   *  lilac fill, reused by the Featured article card. */
  variant?: BadgeVariant;
}

// flat/lilac share every class except height and fill — only those two vary
// per variant, so the surrounding span isn't duplicated per variant.
const flatVariants: Record<FlatBadgeVariant, string> = {
  flat: "h-[35px] bg-hero-badge",
  lilac: "h-[30px] bg-badge-lilac",
};

export default function Badge({ children, className, variant = "pill" }: BadgeProps) {
  if (variant === "flat" || variant === "lilac") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-sm px-3 py-[6px] text-[18px] text-hero-ink",
          flatVariants[variant],
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
