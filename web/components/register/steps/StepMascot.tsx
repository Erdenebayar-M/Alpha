import ChildMascot from "@/components/brand/ChildMascot";

/**
 * The mascot that heads the name and grade steps (nodes 1269:19618 and
 * 1269:20262 draw the girl at a 172x160 box on both cards) — made
 * gender-aware as a deliberate, requested divergence from Figma (which
 * always draws the girl here regardless of the Gender step's answer),
 * matching mobile: the character picked on the Gender step follows into
 * Personal Info / Grade and keeps its idle motion there (mobile's
 * BOY_OPEN_EYES_GAZE / GIRL_GAZE — see genderCharacters.tsx).
 *
 * Decorative: each step already carries its own accessible name, so this
 * adds nothing for a screen reader.
 *
 * `awake` is passed unconditionally true with no `reveal` — the boy's eyes
 * are already open by the time he reaches this step (he opened them on the
 * Gender step), and rendering `awake` true from first paint means the CSS
 * transition never fires here, so the reveal does not replay on arrival.
 */
export default function StepMascot({ gender }: { gender: "boy" | "girl" }) {
  return (
    <ChildMascot
      gender={gender}
      awake
      className={gender === "girl" ? "w-[clamp(112px,20vw,172px)] rotate-[-3.74deg]" : "w-[clamp(112px,20vw,172px)]"}
    />
  );
}
