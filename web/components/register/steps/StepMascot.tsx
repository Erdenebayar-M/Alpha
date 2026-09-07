/**
 * The pink mascot that heads the name and grade steps (nodes 1269:19618 and
 * 1269:20262 — the same art, at the same 172x160 box, on both cards).
 *
 * Decorative: each step already carries its own accessible name, so this adds
 * nothing for a screen reader. Painted as a background for the same reason as
 * the gender cards' mascots — see the note in GenderStep.
 */
export default function StepMascot() {
  return (
    <div
      aria-hidden="true"
      className="w-[clamp(112px,20vw,172px)] rotate-[-3.74deg] bg-[url(/mascots/girl.svg)] bg-contain bg-center bg-no-repeat"
    >
      <div className="aspect-[172/160]" />
    </div>
  );
}
