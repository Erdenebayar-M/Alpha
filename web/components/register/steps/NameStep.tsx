import { registerChild } from "@/lib/content";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import SetupCard from "@/components/register/SetupCard";
import StepMascot from "@/components/register/steps/StepMascot";
import GazeScope from "@/components/register/steps/GazeScope";

interface NameStepProps {
  gender: "boy" | "girl";
  surname: string;
  givenName: string;
  onChangeSurname: (value: string) => void;
  onChangeGivenName: (value: string) => void;
  onContinue: () => void;
}

/** Step 2 of the register-child flow — node 1269:19324, card 1269:19617.
 *
 *  GazeScope makes StepMascot glance down at whichever field is focused
 *  (mobile's GazeProvider/PointedField) — see GazeScope.tsx. */
export default function NameStep({
  gender,
  surname,
  givenName,
  onChangeSurname,
  onChangeGivenName,
  onContinue,
}: NameStepProps) {
  // Both names are required to move on, matching how the design pairs its
  // filled inputs with an enabled CTA. Trimmed so whitespace isn't an answer.
  const canContinue = surname.trim() !== "" && givenName.trim() !== "";

  return (
    <SetupCard
      legend={registerChild.nameLegend}
      onSubmit={() => {
        if (canContinue) onContinue();
      }}
      className="gap-[clamp(24px,5dvh,46px)] py-[clamp(24px,4dvh,30px)]"
    >
      <GazeScope>
        <StepMascot gender={gender} />

        <div className="flex w-full max-w-[354px] flex-col gap-3.5">
          <TextField
            label={registerChild.surnameLabel}
            placeholder={registerChild.surnamePlaceholder}
            value={surname}
            onChange={onChangeSurname}
            autoComplete="family-name"
          />
          <TextField
            label={registerChild.givenNameLabel}
            placeholder={registerChild.givenNamePlaceholder}
            value={givenName}
            onChange={onChangeGivenName}
            autoComplete="given-name"
          />
        </div>
      </GazeScope>

      <Button variant="setupNext" type="submit" disabled={!canContinue} className="max-w-[354px]">
        <span className="sr-only">{registerChild.continueLabel}</span>
      </Button>
    </SetupCard>
  );
}
