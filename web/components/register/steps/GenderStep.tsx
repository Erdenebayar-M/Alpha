import type { CSSProperties } from "react";
import { registerChild } from "@/lib/content";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button";
import ChoiceCard from "@/components/ui/ChoiceCard";
import SetupCard from "@/components/register/SetupCard";
import ChildMascot from "@/components/brand/ChildMascot";

interface GenderStepProps {
  gender: string | null;
  onChange: (id: string) => void;
  onContinue: () => void;
}

/**
 * Where each mascot sits inside its 216x209 card well, as percentages of that
 * well (nodes 1268:18771 for Эрэгтэй, 1268:18825 for Эмэгтэй). Figma positions
 * both by absolute inset, which only holds at the design's own card size —
 * expressed as percentages they stay true at every width the card shrinks to.
 */
const MASCOTS: Record<string, CSSProperties> = {
  // mobile/assets/onboarding/gender/boy/group.svg — the same flattened
  // "07_shy" export this design draws (Figma node 804:9588).
  boy: { left: "22.22%", top: "24.88%", width: "55.77%", height: "46.77%" },
  // Exported flat from Figma: mobile ships this mascot only as eleven
  // separately animatable layers, whose stacking geometry lives in mobile's
  // own RN board code. The tilt is Figma's; the box is its rotated bounding
  // box, so the two differ by under a pixel at this size.
  girl: { left: "12.5%", top: "3.83%", width: "79.7%", height: "76.48%", rotate: "-3.74deg" },
};

/** The green tick that marks the chosen card, node 1268:18818 / 1269:18875 —
 *  always mounted (AvatarBubble's own pattern) and driven by `.gender-check`
 *  in globals.css, so it pops in on the same beat as the boy's eyes opening
 *  instead of cutting in/out with the card border. */
function CheckBadge({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-selected={selected ? "true" : undefined}
      className="gender-check absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full bg-brand-green"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Step 1 of the register-child flow — node 1218:13205, card 1268:18752.
 *
 *  Figma stacks the bordered mascot card and its text label as siblings, but
 *  both live inside the `<label>` here: the text is the only thing that names
 *  this option, so leaving it outside would drop the radio back to announcing
 *  its raw value ("girl"). The border and the tick therefore sit on an inner
 *  box rather than on the label itself, which is why this step draws its own
 *  selected state instead of handing one to ChoiceCard.
 *
 *  The boy's eyes cross-dissolve open on selection and shut again on
 *  deselection (mobile's GenderStep/BOY_EYES_DRIVEN — see ChildMascot.tsx
 *  and the "register-child gender mascot" section of globals.css); the girl
 *  has no equivalent state, only her ambient idle loops. */
export default function GenderStep({ gender, onChange, onContinue }: GenderStepProps) {
  return (
    <SetupCard
      legend={registerChild.genderLegend}
      onSubmit={onContinue}
      className="gap-[clamp(32px,7dvh,80px)] pt-[clamp(32px,8dvh,80px)] pb-[clamp(24px,5dvh,48px)]"
    >
      <fieldset className="m-0 flex w-full justify-center gap-4 border-0 p-0 sm:gap-8">
        <legend className="sr-only">{registerChild.genderLegend}</legend>
        {registerChild.genders.map((option) => {
          const checked = gender === option.id;
          return (
            <ChoiceCard
              key={option.id}
              name="gender"
              value={option.id}
              checked={checked}
              onChange={onChange}
              className="min-w-0 flex-1 flex-col gap-2.5"
            >
              <span
                className={cn(
                  // Width flexes rather than clamping to a hard minimum: two 132px
                  // cards plus their gap overflow a 320px viewport once the card's
                  // own padding is taken off. Capped at the design's 216px.
                  "relative block w-full max-w-[216px] rounded-card border-2 bg-white transition-colors duration-150 ease-press",
                  checked ? "border-task-accent" : "border-setup-border"
                )}
              >
                {/* The well keeps Figma's 216:209 ratio so the percentages above stay exact. */}
                <span className="block aspect-[216/209]" />
                <ChildMascot
                  gender={option.id as "boy" | "girl"}
                  awake={checked}
                  reveal
                  className="absolute"
                  style={MASCOTS[option.id]}
                />
                <CheckBadge selected={checked} />
              </span>
              <span className="text-base font-bold text-setup-label">{option.label}</span>
            </ChoiceCard>
          );
        })}
      </fieldset>

      <Button variant="setupNext" type="submit" disabled={gender === null} className="max-w-[464px]">
        <span className="sr-only">{registerChild.continueLabel}</span>
      </Button>
    </SetupCard>
  );
}
