import { registerChild } from "@/lib/content";
import Button from "@/components/ui/Button";
import ChoiceCard from "@/components/ui/ChoiceCard";
import SetupCard from "@/components/register/SetupCard";
import StepMascot from "@/components/register/steps/StepMascot";
import GazeScope from "@/components/register/steps/GazeScope";

interface GradeStepProps {
  gender: "boy" | "girl";
  grade: string | null;
  onChange: (id: string) => void;
  onContinue: () => void;
}

/** Step 3 of the register-child flow — node 1269:19819, card 1269:20261.
 *
 *  Figma draws the grade pills in one state only (node 1269:20306): it never
 *  shows a chosen one, even on the frames whose CTA has gone live. The selected
 *  treatment below is therefore the same accent-border-on-tinted-fill this
 *  design uses for every other selected control — carried over rather than
 *  invented, but worth confirming against a designed state.
 *
 *  GazeScope makes StepMascot glance down at whichever pill is focused
 *  (mobile's GazeProvider/PointedField) — see GazeScope.tsx. */
export default function GradeStep({ gender, grade, onChange, onContinue }: GradeStepProps) {
  return (
    <SetupCard
      legend={registerChild.gradeLegend}
      onSubmit={() => {
        if (grade !== null) onContinue();
      }}
      className="gap-[clamp(20px,4dvh,28px)] py-[clamp(24px,5dvh,48px)]"
    >
      <GazeScope>
        <StepMascot gender={gender} />

        <fieldset className="m-0 flex w-full max-w-[360px] flex-col gap-3 border-0 p-0">
          <legend className="sr-only">{registerChild.gradeLegend}</legend>
          {registerChild.grades.map((option) => (
            <ChoiceCard
              key={option.id}
              name="grade"
              value={option.id}
              checked={grade === option.id}
              onChange={onChange}
              className="h-[clamp(52px,7dvh,66px)] rounded-pill px-3.5 text-xs font-extrabold text-setup-label"
              checkedClassName="border-2 border-task-accent bg-task-badge"
              uncheckedClassName="border-2 border-transparent bg-setup-grade"
            >
              {option.label}
            </ChoiceCard>
          ))}
        </fieldset>
      </GazeScope>

      <Button
        variant="setupNext"
        type="submit"
        disabled={grade === null}
        className="max-w-[354px]"
      >
        <span className="sr-only">{registerChild.continueLabel}</span>
      </Button>
    </SetupCard>
  );
}
