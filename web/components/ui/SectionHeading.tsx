import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

/**
 * The heading treatment shared by /landing-new's Featured article
 * ("Онцлох нийтлэл", node 1401:22287), Articles-for-parents grid and
 * Collections row sections: Nunito Bold 28px, 1.2 line height, -0.84px
 * tracking, `text-label` (#2a4263, matching Figma's own token despite the
 * node's literal `#090909` fallback). Renders `h2` — each of these is a
 * top-level page section alongside the hero's `h1`.
 */
export default function SectionHeading({ id, children, className }: SectionHeadingProps) {
  return (
    <h2 id={id} className={cn("text-[28px] leading-[1.2] font-bold tracking-[-0.84px] text-text-label", className)}>
      {children}
    </h2>
  );
}
