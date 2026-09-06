import { registerChild } from "@/lib/content";
import Button from "@/components/ui/Button";
import ChoiceField, { type ChoiceFieldOption } from "@/components/register/ChoiceField";

interface ProfileStepProps {
  age: number | null;
  gender: string | null;
  grade: string | null;
  onChangeAge: (age: number) => void;
  onChangeGender: (id: string) => void;
  onChangeGrade: (id: string) => void;
  onContinue: () => void;
}

const ageOptions: readonly ChoiceFieldOption[] = registerChild.ages.map((value) => ({
  value: String(value),
  label: (
    <span className="flex flex-col items-center">
      <span className="text-[22px] font-extrabold text-brand-blue">{value}</span>
      <span className="text-base font-bold text-text-label">{registerChild.ageSuffix}</span>
    </span>
  ),
}));

const genderOptions: readonly ChoiceFieldOption[] = registerChild.genders.map((option) => ({
  value: option.id,
  label: <span className="whitespace-nowrap text-[15px] font-extrabold text-text-label">{option.label}</span>,
}));

const gradeOptions: readonly ChoiceFieldOption[] = registerChild.grades.map((option) => ({
  value: option.id,
  label: <span className="whitespace-nowrap text-[15px] font-extrabold text-brand-blue">{option.label}</span>,
}));

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

  const fields = [
    {
      legend: registerChild.ageLabel,
      name: "age",
      listClassName: "grid grid-cols-2 gap-2.5 sm:grid-cols-4",
      cardClassName: "h-[clamp(48px,7dvh,64px)] px-5 py-3",
      options: ageOptions,
      selected: age === null ? null : String(age),
      onChange: (value: string) => onChangeAge(Number(value)),
    },
    {
      legend: registerChild.genderLabel,
      name: "gender",
      listClassName: "flex gap-3",
      cardClassName: "h-[clamp(48px,7dvh,64px)] flex-1 p-4",
      options: genderOptions,
      selected: gender,
      onChange: onChangeGender,
    },
    {
      legend: registerChild.gradeLabel,
      name: "grade",
      listClassName: "flex flex-wrap gap-2.5",
      cardClassName: "h-[clamp(48px,7dvh,64px)] px-3.5 py-2.5",
      options: gradeOptions,
      selected: grade,
      onChange: onChangeGrade,
    },
  ];

  return (
    <form
      className="flex flex-col gap-6 lg:gap-[clamp(20px,4dvh,51px)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (canContinue) onContinue();
      }}
    >
      {fields.map((field, index) => (
        <ChoiceField key={field.name} {...field} delayMs={index * 80} />
      ))}

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
