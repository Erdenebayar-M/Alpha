import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { diagnostic } from "@/lib/content";
import Button from "@/components/ui/Button";
import StepCard from "@/components/register/StepCard";

interface TaskCardProps {
  /** 1-based position in the diagnostic, shown in the count badge. */
  position: number;
  /** Omitted by the live diagnostic flow, whose adaptive length isn't known
   *  up front — see lib/api/task-type-map.ts. When present, the fixture's
   *  original "n / total" screen-reader text is used; when absent, the
   *  count badge (which never showed a total) is the whole story. */
  total?: number;
  prompt: string;
  /** Whether the exercise has been answered enough to move on. */
  canContinue: boolean;
  onNext: () => void;
  /** Per-exercise vertical rhythm — Figma's nine cards run 28px to 60px
   *  between their header, body and CTA. */
  className?: string;
  children: ReactNode;
}

/**
 * The white card every diagnostic exercise renders inside (Figma's "Audio Task
 * Card", "Fill Letter Task Card", "Match Task Card" … nodes 1270:22692 through
 * 1255:17752). The header, the count badge and the green CTA are identical
 * across all nine, so they live here and each renderer supplies only its body.
 *
 * The design draws those nine cards at 760, 780 and 792px — a designer nudge
 * per card rather than three intentional sizes — so they are normalised to one
 * 780px maximum here instead of being carried through as data.
 *
 * There is deliberately no progress bar: the count badge is this flow's only
 * progress indicator in the design, unlike mobile's LessonHeader, which pairs
 * its `n/total` counter with a filled track. The badge carries the full
 * position for screen readers so the information isn't lost with the bar.
 */
export default function TaskCard({
  position,
  total,
  prompt,
  canContinue,
  onNext,
  className,
  children,
}: TaskCardProps) {
  return (
    <StepCard
      animationClassName="animate-step-in"
      className="mx-auto w-full max-w-[780px] rounded-card"
      style={{ boxShadow: "var(--shadow-task-card)" }}
    >
      <div className={cn("flex flex-col items-center px-6 pt-8 pb-10 sm:px-12", className)}>
        <header className="flex w-full items-center gap-2.5">
          <p className="shrink-0 rounded-pill bg-task-badge px-3.5 py-2 text-[13px] font-black text-task-accent">
            {diagnostic.countBadge(position)}
            <span className="sr-only"> — {diagnostic.progressLabel(position, total)}</span>
          </p>
          <h1 className="min-w-0 text-base font-bold text-task-muted sm:text-xl">{prompt}</h1>
        </header>

        {children}

        <Button variant="taskNext" onClick={onNext} disabled={!canContinue}>
          {diagnostic.nextLabel}
        </Button>
      </div>
    </StepCard>
  );
}
