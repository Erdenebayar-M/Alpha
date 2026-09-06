import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StepCardProps {
  animationClassName: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * The white card shell each register-child step renders inside. The parent
 * screen (app/register-child/page.tsx) is a fixed h-[calc(100dvh-5rem)]
 * section with no page scroll, so this card can't just be tall — it must
 * cap at that same available height (100dvh minus the 5rem header and 2rem
 * of section padding, hence -7rem) and size to its own content below that,
 * instead of forcing a fixed box. overflow-y-auto is a fallback for
 * pathologically short viewports where content still can't fully fit; the
 * page itself never scrolls, only this card would.
 *
 * Each step keeps its own entrance animation, border/shadow treatment and
 * padding via `animationClassName`/`className`/`style` — only the height
 * cap and scroll fallback are shared.
 */
export default function StepCard({ animationClassName, className, style, children }: StepCardProps) {
  return (
    <div
      className={cn("max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-lg bg-white", animationClassName, className)}
      style={style}
    >
      {children}
    </div>
  );
}
