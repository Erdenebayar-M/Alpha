import type { CharacterArt } from '@/src/features/onboarding/characters';
import type { Leaf } from '@/src/features/onboarding/FigmaBoard';
import {
  withBlink,
  withFadeOut,
  withFloat,
  withPulse,
  withReveal,
  withSmile,
} from '@/src/features/onboarding/idleLoops';

// Boy ("Эрэгтэй", Figma node 804:9588 inside the Gender frames) — the closed-eye default.
import BoyGroupArt from '@/assets/onboarding/gender/boy/group.svg';

// Boy, decomposed for the open-eyes state (`BOY_OPEN_EYES` below): `group.svg` above is
// one flattened export, but it turns out Figma kept named sub-groups inside that single
// file — a body (no eyes, no arms), and the two arms separately, each a distinct `<g>` at
// its own position. These three files are that same file split along those boundaries,
// same viewBox on all three, so they stay pixel-aligned stacked at the same box.
import BoyArmLeftArt from '@/assets/onboarding/gender/boy/arm-left.svg';
import BoyArmRightArt from '@/assets/onboarding/gender/boy/arm-right.svg';
import BoyBodyArt from '@/assets/onboarding/gender/boy/body.svg';
// The `<g id="face">` half of that same split: the two black arcs `group.svg` draws for
// his shut eyes, which `body.svg` omits. Kept as its own leaf purely so it can fade out
// under the opening eyes instead of vanishing with the rest of the swap.
import BoyClosedEyesArt from '@/assets/onboarding/gender/boy/closed-eyes.svg';

// There is still no "open eyes" export of "07_shy" anywhere in the Figma file (checked
// the whole page's metadata), so the eyes themselves still come from Slide 1's Yellow
// mascot (`../characters.tsx`) — imported fresh here (not reused from that file) so they
// can be wrapped with this context's own reveal animation instead of Slide 1's
// blink-only one. Sized and positioned against the reference "07_shy" card by eye, not
// from any shared source geometry — see `BOY_OPEN_EYES` below.
import YellowEyeLeftArt from '@/assets/onboarding/slide1/yellow/eye-left.svg';
import YellowEyeRightArt from '@/assets/onboarding/slide1/yellow/eye-right.svg';

// Girl ("Эмэгтэй", Figma node 804:9541 inside the Gender frames)
import GirlBlushArt from '@/assets/onboarding/gender/girl/blush.svg';
import GirlBody from '@/assets/onboarding/gender/girl/body.svg';
import GirlBodyEdgeLight from '@/assets/onboarding/gender/girl/body-edge-light.svg';
import GirlDot from '@/assets/onboarding/gender/girl/dot.svg';
import GirlEyesArt from '@/assets/onboarding/gender/girl/eyes.svg';
import GirlHeartArt from '@/assets/onboarding/gender/girl/heart.svg';
import GirlLandscapeDecoration from '@/assets/onboarding/gender/girl/landscape-decoration.svg';
import GirlMiddleMark from '@/assets/onboarding/gender/girl/middle-mark.svg';
import GirlMouthArt from '@/assets/onboarding/gender/girl/mouth.svg';
import GirlSquiggle from '@/assets/onboarding/gender/girl/squiggle.svg';
import GirlTopMark from '@/assets/onboarding/gender/girl/top-mark.svg';

// Wrapped once at module scope so every render reuses the same component identity —
// rebuilding these per render would restart each loop on every keystroke in the
// personal-info step.
const GirlEyes = withBlink(GirlEyesArt);
const GirlMouth = withSmile(GirlMouthArt);
const GirlBlush = withPulse(GirlBlushArt);
const GirlHeart = withFloat(GirlHeartArt);

export type Gender = 'boy' | 'girl';

/**
 * Both characters are transcribed from the "07_shy 1" frame that holds them
 * (`get_metadata` on 804:9231 / 804:9538 — 216x209 each), and reuse the `CharacterArt`
 * shape and `FigmaBoard` renderer that the brand mascots in `../characters.tsx` use.
 *
 * Boxes come from Figma's *measured* node geometry rather than the design context's
 * percentage insets: the two disagree on the girl's wrapper (see `GIRL` below), and the
 * measured values are consistent across all three frames that embed her.
 */
const BOARD = { width: 216, height: 209 } as const;

// ---------------------------------------------------------------------------
// Boy — a single flattened export (Figma "Group 22", 804:9588, which has no children).
// There is no eye layer to blink and his eyes are already drawn as happy closed arcs,
// so his idle is a whole-character breathe rather than a blink. Giving him a real blink
// would need the designer to re-export him layered, the way the girl already is.
//
// The breathe is declared via `breathe` rather than wrapped around the `Art`, so it is
// the *same* loop instance on the same wrapper that `BOY_OPEN_EYES` uses — that is what
// keeps him breathing on unbroken phase across the selection swap.
// ---------------------------------------------------------------------------

export const BOY: CharacterArt = {
  size: BOARD,
  breathe: true,
  // Measured: (47.999, 52) 120.413 x 96.332, grown by the design context's -1.48% top
  // bleed to the asset's natural 120.472 x 97.754.
  leaves: [{ Art: BoyGroupArt, box: { left: 47.999, top: 50.574, width: 120.472, height: 97.754 } }],
};

// ---------------------------------------------------------------------------
// Girl — decomposed leaf by leaf from 804:9541, same transcription method as
// `PINK`/`GREEN` in `../characters.tsx`. Inner leaves keep their raw `inset`/`hypot`/
// `rotate`/`skewX` so they stay diffable against the design context; only the outer
// rotated wrapper is pre-resolved, because `FigmaBoard` centres a rotated child in its
// box and Figma reports that box directly.
// ---------------------------------------------------------------------------

/**
 * The face box the eyes and mouth are carved out of: measured at (63.076, 63.194) and
 * grown by the design context's `expand` to the original face export's natural
 * 31.9416 x 34.7996. `eyes.svg` is the top 25.8131 of that space and `mouth.svg` is
 * cropped to the mouth's own bounds, so each animates about its own centre.
 */
const FACE = { left: 63.076, top: 63.194 } as const;

const GIRL_INNER: readonly Leaf[] = [
  {
    Art: GirlBody,
    inset: [24.84, 17.87, 9.46, 15.09],
    hypot: { width: [96.903, 9.98364], height: [-8.34697, 96.7503] },
    rotate: 5.23,
    skewX: -0.32,
  },
  {
    Art: GirlBodyEdgeLight,
    inset: [25.5, 18.42, 10.65, 15.82],
    hypot: { width: [99.2496, 7.39661], height: [-6.26898, 99.7338] },
    rotate: 3.75,
    skewX: -0.34,
  },
  {
    Art: GirlLandscapeDecoration,
    inset: [62.44, 21.06, 9.32, 15.04],
    hypot: { width: [98.414, 27.1281], height: [-3.25755, 90.8637] },
    rotate: 5.51,
    skewX: -0.34,
  },
  { Art: GirlEyes, box: { ...FACE, width: 31.9416, height: 25.8131 } },
  { Art: GirlMouth, box: { left: FACE.left + 9.5, top: FACE.top + 29.4, width: 12, height: 5.6 } },
  {
    // The flower's stem half.
    Art: GirlMiddleMark,
    inset: [58.93, 11.57, 38.13, 83.7],
    hypot: { width: [90.6724, 53.6873], height: [-9.64397, 56.7139] },
    rotate: 17.11,
    skewX: -1,
    expand: [-42.02, -13.74, -42.03, -13.74],
  },
  {
    // The flower's head half.
    Art: GirlTopMark,
    inset: [53.57, 13.84, 43.44, 82.46],
    expand: [-22.36, -16.63, -22.36, -16.63],
  },
  {
    Art: GirlHeart,
    inset: [28.05, 13.05, 55.72, 71.29],
    hypot: { width: [62.0675, 44.5248], height: [-38.9341, 57.2901] },
    rotate: 34.12,
    skewX: -1.62,
  },
  {
    Art: GirlDot,
    inset: [86.31, 29.25, 6.24, 21.92],
    hypot: { width: [99.6566, 86.1907], height: [-0.622867, 99.5211] },
    rotate: 3.75,
    skewX: -0.98,
  },
  // Cheeks — pulsed independently so she keeps moving between blinks.
  { Art: GirlBlush, inset: [57.26, 34.68, 34.02, 31.71] },
  {
    Art: GirlSquiggle,
    inset: [64.03, 77, 20, 2.41],
    hypot: { width: [99.7783, 9.62863], height: [-4.41889, 99.7705] },
    rotate: 3.75,
    skewX: 0.01,
    expand: [-2.29, -1.55, -2.29, -1.56],
  },
];

export const GIRL: CharacterArt = {
  size: BOARD,
  leaves: [
    {
      // Figma's two sources disagree on this box's `top`: the design context's 3.83%
      // inset works out to 8, while `get_metadata` reports 18.617 for all three frames
      // that embed her. Rendering both and measuring the pink silhouette against Figma's
      // own export settled it — 18.617 sits ~10px low, so the inset wins. (Figma appears
      // to report a rotated frame's `y` as something other than its bounding-box top.)
      box: { left: 27, top: 8.005, width: 172.155, height: 159.845 },
      size: { width: 162.74, height: 149.54 },
      rotate: -3.74,
      clip: true,
      board: { width: 162.74, height: 149.54, leaves: GIRL_INNER },
    },
  ],
};

export const CHARACTERS: Record<Gender, CharacterArt> = { boy: BOY, girl: GIRL };

/** Figma offsets the white circle behind each character differently per gender. */
export const CIRCLE_LEFT: Record<Gender, number> = { boy: 23, girl: 27 };

// ---------------------------------------------------------------------------
// Boy, selected/open-eyes — built from the real "07_shy" body and both real arms
// (`body.svg`/`arm-right.svg`/`arm-left.svg`, split out of the same `group.svg` `BOY`
// uses above), not a swapped-in different character. One shared `CharacterArt`, used
// identically by both the Gender step (`GenderStep.tsx`, from the moment he's selected)
// and Personal Info (`PersonalInfoStep.tsx`, arriving already selected) — both want the
// same open-eyes-and-blink behaviour, so there's no reason to split it in two.
//
// Both arms are completely static, exactly as designed — nothing in the source ever
// animates on its own, and this character doesn't add motion that isn't there. Only the
// eyes are foreign art (Yellow's, per the import comment above); everything else is
// unmodified "07_shy". Grade keeps the plain closed-eye `BOY`.
// ---------------------------------------------------------------------------

// Exactly the pace the pink mascot blinks at — `PinkEyeLeft`/`PinkEyeRight` in
// `characters.tsx` are `withBlink(..., 2400)`, and both variants below feed this same
// number through the identical 70/120ms squash, so the boy's steady blink is pink's.
// (Slide 1's own Yellow stays at 3800: `characters.tsx` staggers its three mascots on
// purpose so they don't blink in lockstep.)
const BOY_BLINK_HOLD_MS = 2400;

/** The local board every "07_shy" piece shares — same as `BOY`'s single box above. */
const BODY_LOCAL = { width: 120.472, height: 97.754 };
const FULL_BODY_BOX = { left: 0, top: 0, ...BODY_LOCAL };
// Sized by eye against the reference card — there's no Figma source for "07_shy, but
// open" to measure against (see the import comment above). The *spacing*, however, is
// measured: these are Yellow's eyes, so they sit at Yellow's own eye-to-eye proportion.
// `YELLOW` in `characters.tsx` puts its two 33.4/34.0-wide eyes 32.038 apart centre to
// centre — 0.950x their width — which at this 20-wide scale is 19.005. Centred on the
// closed arcs' own midpoint (62.408) so the pair stays where the face expects it.
// (Eyeballed, these were 28 apart: 1.400x eye width, ~47% too wide.)
//
// They overlap by ~1 board px at this spacing, exactly as Yellow's do (1.68 at his
// scale); the right leaf paints after the left, matching Yellow's own paint order.
const EYE_LEFT_BOX = { left: 42.906, top: 17, width: 20, height: 22 }; // centre 52.906
const EYE_RIGHT_BOX = { left: 61.911, top: 17, width: 20, height: 22 }; // centre 71.911

// The shut eye starts centred on the closed arc it dissolves out of (arc centres 48.639
// and 76.177) and converges inward to its real box as it opens, so the swap between arc
// and eye happens with the two in the same place. Symmetric, hence one constant.
const EYE_SLIDE_X = 4.267;

/** Body and both arms — identical in both open-eyed variants; only the eyes differ. */
const BOY_BODY_LEAVES: readonly Leaf[] = [
  { Art: BoyBodyArt, box: FULL_BODY_BOX },
  { Art: BoyArmRightArt, box: FULL_BODY_BOX },
  { Art: BoyArmLeftArt, box: FULL_BODY_BOX },
];

const boyBoard = (leaves: readonly Leaf[]): CharacterArt => ({
  size: BOARD,
  breathe: true,
  leaves: [{ box: { left: 47.999, top: 50.574, ...BODY_LOCAL }, board: { ...BODY_LOCAL, leaves } }],
});

const FadingClosedEyes = withFadeOut(BoyClosedEyesArt);
const RevealBoyEyeLeft = withReveal(YellowEyeLeftArt, 320, BOY_BLINK_HOLD_MS, 110, -EYE_SLIDE_X);
const RevealBoyEyeRight = withReveal(YellowEyeRightArt, 320, BOY_BLINK_HOLD_MS, 110, EYE_SLIDE_X);
const BlinkBoyEyeLeft = withBlink(YellowEyeLeftArt, BOY_BLINK_HOLD_MS);
const BlinkBoyEyeRight = withBlink(YellowEyeRightArt, BOY_BLINK_HOLD_MS);

/**
 * The boy at the moment he's picked, on the Gender step only — his eyes open once, then
 * settle into the steady blink below.
 *
 * The opening is a cross-dissolve, not a cut. `body.svg` has no eyes at all, so the shut
 * arcs are re-added here as their own `withFadeOut` leaf and retire (~160ms) while the
 * real eyes are still held shut by `withReveal`'s shut-hold (110ms). Squashed to
 * `SHUT_SCALE_Y` the eyes read as a dark line at y≈28 in board space, about the arcs'
 * own stroke weight, and `EYE_SLIDE_X` puts them on the arcs' x centres for the duration
 * of that hold — so there is no frame where the face is bare and none where arc and eye
 * are visible as two separate shapes. The eyes then converge to their real, narrower
 * spacing as they open.
 */
export const BOY_OPEN_EYES: CharacterArt = boyBoard([
  ...BOY_BODY_LEAVES,
  { Art: FadingClosedEyes, box: FULL_BODY_BOX },
  { Art: RevealBoyEyeLeft, box: EYE_LEFT_BOX },
  { Art: RevealBoyEyeRight, box: EYE_RIGHT_BOX },
]);

/**
 * The same open-eyed boy, already awake — Personal Info and Grade, which he always
 * reaches after being selected. Plain `withBlink` at pink's pace, no reveal and no shut
 * arcs, so the opening plays once where it means something (the tap) rather than
 * replaying on arrival at every later step.
 */
export const BOY_OPEN_EYES_STEADY: CharacterArt = boyBoard([
  ...BOY_BODY_LEAVES,
  { Art: BlinkBoyEyeLeft, box: EYE_LEFT_BOX },
  { Art: BlinkBoyEyeRight, box: EYE_RIGHT_BOX },
]);
