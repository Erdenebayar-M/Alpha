import { registerChild } from "@/lib/content";
import ChoiceCard from "@/components/ui/ChoiceCard";
import Button from "@/components/ui/Button";

interface ProfileStepProps {
  age: number | null;
  gender: string | null;
  grade: string | null;
  onChangeAge: (age: number) => void;
  onChangeGender: (id: string) => void;
  onChangeGrade: (id: string) => void;
  onContinue: () => void;
}

/** Step 1 of the register-child flow, node 1218:13843 ("Хувийн мэдээлэл").
 *  Figma renders the selected label one size up from the unselected ones
 *  (20px vs. 15px), but reproducing that literally grew the gender/grade
 *  labels enough to wrap or widen their chip on select, reflowing the row —
 *  so selection is shown via ChoiceCard's border/background only, at one
 *  constant label size. */
export default function ProfileStep({
  age,
  gender,
  grade,
  onChangeAge,
  onChangeGender,
  onChangeGrade,
  onContinue,
}: ProfileStepProps) {
  const canContinue = age !== null && gender !== null && grade !== null;

  return (
    <form
      className="flex flex-col gap-6 lg:gap-[clamp(20px,4dvh,51px)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (canContinue) onContinue();
      }}
    >
      <fieldset className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0 lg:pl-[43px]">
        <legend className="animate-rise-in p-0 text-xl font-extrabold text-text-label [animation-delay:0ms]">
          {registerChild.ageLabel}
        </legend>
        <div className="grid animate-rise-in grid-cols-2 gap-2.5 [animation-delay:0ms] sm:grid-cols-4">
          {registerChild.ages.map((value) => (
            <ChoiceCard
              key={value}
              name="age"
              value={String(value)}
              checked={age === value}
              onChange={() => onChangeAge(value)}
              className="h-[clamp(48px,7dvh,64px)] px-5 py-3"
            >
              <span className="flex flex-col items-center">
                <span className="text-[22px] font-extrabold text-brand-blue">{value}</span>
                <span className="text-base font-bold text-text-label">{registerChild.ageSuffix}</span>
              </span>
            </ChoiceCard>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0 lg:pl-[43px]">
        <legend className="animate-rise-in p-0 text-xl font-extrabold text-text-label [animation-delay:80ms]">
          {registerChild.genderLabel}
        </legend>
        <div className="flex animate-rise-in gap-3 [animation-delay:80ms]">
          {registerChild.genders.map((option) => (
            <ChoiceCard
              key={option.id}
              name="gender"
              value={option.id}
              checked={gender === option.id}
              onChange={onChangeGender}
              className="h-[clamp(48px,7dvh,64px)] flex-1 p-4"
            >
              <span className="whitespace-nowrap text-[15px] font-extrabold text-text-label">{option.label}</span>
            </ChoiceCard>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0 lg:pl-[43px]">
        <legend className="animate-rise-in p-0 text-xl font-extrabold text-text-label [animation-delay:160ms]">
          {registerChild.gradeLabel}
        </legend>
        <div className="flex animate-rise-in flex-wrap gap-2.5 [animation-delay:160ms]">
          {registerChild.grades.map((option) => (
            <ChoiceCard
              key={option.id}
              name="grade"
              value={option.id}
              checked={grade === option.id}
              onChange={onChangeGrade}
              className="h-[clamp(48px,7dvh,64px)] px-3.5 py-2.5"
            >
              <span className="whitespace-nowrap text-[15px] font-extrabold text-brand-blue">{option.label}</span>
            </ChoiceCard>
          ))}
        </div>
      </fieldset>

      {/* animate-rise-in goes on this wrapper, not the button — a CSS
          animation's own opacity keyframe otherwise permanently overrides
          disabled:opacity-50 (animations win over normal declarations for
          their whole fill-mode duration). Same split HeroContent.tsx uses
          for its CTA. */}
      <div className="animate-rise-in [animation-delay:240ms]">
        <Button
          variant="cta"
          type="submit"
          disabled={!canContinue}
          className="disabled:pointer-events-none disabled:opacity-50"
          style={{ borderBottomColor: "var(--color-brand-blue)", height: "clamp(56px, 8dvh, 80px)" }}
        >
          {registerChild.continueLabel}
        </Button>
      </div>
    </form>
  );
}
