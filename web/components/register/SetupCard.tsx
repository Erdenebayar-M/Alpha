import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import StepCard from "@/components/register/StepCard";

interface SetupCardProps {
  /** Names the step for assistive tech; the design draws no visible heading. */
  legend: string;
  /** Fires when the step's CTA is submitted — each step gates this itself. */
  onSubmit: () => void;
  /** Per-step padding and vertical rhythm. Figma gives the three cards
   *  different values (80/46/28px gaps at nodes 1268:18752, 1269:19617,
   *  1269:20261), so the shell owns only what they share. */
  className?: string;
  children: ReactNode;
}

/**
 * The white card the three setup steps (gender, name, grade) render inside —
 * Figma's "Setup card", 620px wide with a 32px radius, centred on the scene.
 *
 * The inner element is a `<form>` so the CTA can be a real submit button:
 * pressing Enter in the name step's inputs then advances the flow the way it
 * would in any other form. Whether it *may* advance is each step's own call,
 * hence the gating lives there and not here.
 */
export default function SetupCard({ legend, onSubmit, className, children }: SetupCardProps) {
  return (
    <StepCard
      animationClassName="animate-step-in"
      className="mx-auto w-full max-w-[620px] rounded-card"
      style={{ boxShadow: "var(--shadow-setup-card)" }}
    >
      <form
        className={cn("flex flex-col items-center px-6 sm:px-12", className)}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <h1 className="sr-only">{legend}</h1>
        {children}
      </form>
    </StepCard>
  );
}
