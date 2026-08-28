import type { Inset, Leaf, Size } from '@/src/features/onboarding/FigmaBoard';
import { withBlink } from '@/src/features/onboarding/idleLoops';

// Pink mascot ("pinky_mountain_default_no_legs_editable")
import PinkArmFull from '@/assets/onboarding/slide1/pink/arm-line-full.svg';
import PinkBlush from '@/assets/onboarding/slide1/pink/blush.svg';
import PinkBody from '@/assets/onboarding/slide1/pink/body.svg';
import PinkBrow from '@/assets/onboarding/slide1/pink/brow.svg';
import PinkEdge1 from '@/assets/onboarding/slide1/pink/edge1.svg';
import PinkEdge2 from '@/assets/onboarding/slide1/pink/edge2.svg';
import PinkEyeLeftArt from '@/assets/onboarding/slide1/pink/eye-left.svg';
import PinkEyeRightArt from '@/assets/onboarding/slide1/pink/eye-right.svg';
import PinkFlowerHead from '@/assets/onboarding/slide1/pink/flower-head.svg';
import PinkHair from '@/assets/onboarding/slide1/pink/hair.svg';
import PinkLandscape from '@/assets/onboarding/slide1/pink/landscape.svg';
import PinkMouth from '@/assets/onboarding/slide1/pink/mouth.svg';
import PinkShadow from '@/assets/onboarding/slide1/pink/shadow.svg';
import PinkStem from '@/assets/onboarding/slide1/pink/stem.svg';

// Green mascot ("greeny_mountain_thinking_editable")
import GreenArm from '@/assets/onboarding/slide1/green/arm.svg';
import GreenBlush from '@/assets/onboarding/slide1/green/blush.svg';
import GreenBody1 from '@/assets/onboarding/slide1/green/body1.svg';
import GreenBody2 from '@/assets/onboarding/slide1/green/body2.svg';
import GreenBrow from '@/assets/onboarding/slide1/green/brow.svg';
import GreenFaceArt from '@/assets/onboarding/slide1/green/face.svg';
import GreenHair from '@/assets/onboarding/slide1/green/hair.svg';
import GreenHand1 from '@/assets/onboarding/slide1/green/hand1.svg';
import GreenHand2 from '@/assets/onboarding/slide1/green/hand2.svg';
import GreenLandscape from '@/assets/onboarding/slide1/green/landscape.svg';
import GreenMitten1 from '@/assets/onboarding/slide1/green/mitten1.svg';
import GreenMitten2 from '@/assets/onboarding/slide1/green/mitten2.svg';
import GreenShadow from '@/assets/onboarding/slide1/green/shadow.svg';
import GreenSparkle from '@/assets/onboarding/slide1/green/sparkle.svg';
import GreenStarA from '@/assets/onboarding/slide1/green/star-a.svg';
import GreenStarB from '@/assets/onboarding/slide1/green/star-b.svg';

// Yellow mascot (the centrepiece, Figma "Group 22")
import YellowBodyHi from '@/assets/onboarding/slide1/yellow/body-hi.svg';
import YellowBody from '@/assets/onboarding/slide1/yellow/body.svg';
import YellowBrowLeft from '@/assets/onboarding/slide1/yellow/brow-left.svg';
import YellowBrowRight from '@/assets/onboarding/slide1/yellow/brow-right.svg';
import YellowEyeLeftArt from '@/assets/onboarding/slide1/yellow/eye-left.svg';
import YellowEyeRightArt from '@/assets/onboarding/slide1/yellow/eye-right.svg';
import YellowHandFull from '@/assets/onboarding/slide1/yellow/hand-full.svg';
import YellowHill1 from '@/assets/onboarding/slide1/yellow/hill1.svg';
import YellowHill2 from '@/assets/onboarding/slide1/yellow/hill2.svg';
import YellowMouthMask from '@/assets/onboarding/slide1/yellow/mouth-mask.svg';
import YellowMouth from '@/assets/onboarding/slide1/yellow/mouth.svg';
import YellowPathCenter from '@/assets/onboarding/slide1/yellow/path-center.svg';
import YellowPath from '@/assets/onboarding/slide1/yellow/path.svg';
import YellowShadow from '@/assets/onboarding/slide1/yellow/shadow.svg';
import YellowStem from '@/assets/onboarding/slide1/yellow/stem.svg';
import YellowWhiteFlower from '@/assets/onboarding/slide1/yellow/white-flower.svg';
import YellowYellowFlower from '@/assets/onboarding/slide1/yellow/yellow-flower.svg';

// Yellow's waving left arm — its own animated layer, so its own board.
import YellowArmFull from '@/assets/onboarding/slide1/hand/full.svg';

// Wrapped once at module scope so every render reuses the same component identity —
// rebuilding these per render would restart the blink loop on every re-render of the
// carousel. Each mascot's `holdMs` is staggered so the three don't blink in lockstep.
const PinkEyeLeft = withBlink(PinkEyeLeftArt, 2400);
const PinkEyeRight = withBlink(PinkEyeRightArt, 2400);
const GreenFace = withBlink(GreenFaceArt, 3100);
const YellowEyeLeft = withBlink(YellowEyeLeftArt, 3800);
const YellowEyeRight = withBlink(YellowEyeRightArt, 3800);

/**
 * Each mascot is a Figma sub-frame, transcribed leaf by leaf. Every `inset`,
 * `hypot`, `expand` and `rotate` below is copied straight from the design context
 * for node 163:1739 — `FigmaBoard` does the arithmetic at render time so these stay
 * diffable against Figma rather than being collapsed into magic numbers.
 *
 * `size` is the board's own coordinate space; a character is rendered at that size
 * and then scaled as one unit to whatever the device gives us.
 */
export interface CharacterArt {
  size: Size;
  leaves: readonly Leaf[];
  /**
   * Breathe the whole board on a persistent wrapper (`AvatarBubble` via
   * `useBreatheStyle`) rather than inside any one leaf. Set it on every variant of a
   * character that can be swapped in place: the loop then lives on a view that survives
   * the swap, so the breathing never restarts mid-breath. Slide 1's mascots don't use
   * it — they're rendered by `Slide1.tsx`, not `AvatarBubble`.
   */
  breathe?: boolean;
}

// ---------------------------------------------------------------------------
// Pink — leans in from the left, holding a flower.
// ---------------------------------------------------------------------------

const PINK_INNER: readonly Leaf[] = [
  { Art: PinkShadow, inset: [85.46, 21.66, 6.88, 27.27], expand: [-87.15, -10.82, -87.15, -10.82] },
  { Art: PinkBody, inset: [24.19, 19.03, 12.48, 19.03] },
  { Art: PinkEdge1, inset: [24.17, 19.09, 12.9, 18.84] },
  { Art: PinkEdge2, inset: [24.1, 19.19, 12.77, 18.84] },
  { Art: PinkLandscape, inset: [66.01, 19.11, 12.5, 18.9] },
  {
    Art: PinkEyeLeft,
    box: { left: 83.35, top: 78.43, width: 19.196, height: 28.31 },
    skewX: 0.19,
    expand: [-21.19, -19.19, -17.73, -30.95],
  },
  {
    Art: PinkEyeRight,
    box: { left: 109.73, top: 76.36, width: 22.709, height: 30.214 },
    skewX: 0.3,
    expand: [-10.02, -5.94, -13.24, -14.41],
  },
  { Art: PinkBlush, inset: [54.46, 32.52, 42.02, 32.72], expand: [-63.32, -5.3, -63.3, -5.3] },
  {
    Art: PinkMouth,
    inset: [56.37, 42.7, 17.7, 33.69],
    hypot: { width: [90.3685, 16.5663], height: [-20.2895, 83.2949] },
    rotate: 10.46,
    skewX: -3.14,
  },
  {
    Art: PinkBrow,
    inset: [56.66, 44.36, 34.71, 44.81],
    hypot: { width: [85.6785, -12.982], height: [6.56559, 59.4006] },
    rotate: -7.25,
    skewX: 0.24,
  },
  {
    // The flower is its own 68x112 frame, counter-rotated against the body's tilt.
    box: { left: 121.83, top: 19.72, width: 101.915, height: 128.412 },
    size: { width: 68, height: 112 },
    rotate: 19.8,
    clip: true,
    board: {
      width: 68,
      height: 112,
      leaves: [
        { Art: PinkFlowerHead, inset: [12.37, 33.13, 55.86, 7.53] },
        { Art: PinkStem, inset: [37.01, 30.77, 15.21, 30.77], expand: [-2.8, 0, -2.8, 0] },
      ],
    },
  },
  {
    Art: PinkHair,
    box: { left: 35.98, top: -31.46, width: 145.8, height: 127.808 },
    expand: [-1.56, -1.37, 0, 0],
  },
];

export const PINK: CharacterArt = {
  size: { width: 265.209, height: 242.637 },
  leaves: [
    {
      box: { left: 0, top: 0, width: 265.209, height: 242.637 },
      size: { width: 217.182, height: 179.699 },
      rotate: -19.8,
      clip: true,
      board: { width: 217.182, height: 179.699, leaves: PINK_INNER },
    },
    {
      // Figma's own flattened export (164:2133) used verbatim — the hypot +
      // rotate + skew + expand reconstruction here was unreliable, same as
      // both hand rigs: the computed art size (~37x10) didn't match the raw
      // asset's natural size (58.25x27.43) at all. Box is centred on the
      // loop's measured ink bounds in the full-slide render.
      Art: PinkArmFull,
      box: { left: 50, top: 154, width: 50, height: 43 },
    },
  ],
};

// ---------------------------------------------------------------------------
// Green — the tallest, arms raised. Both hands share one sub-frame shape.
// ---------------------------------------------------------------------------

/**
 * Both of green's hands are the same Figma component, mirrored — but the
 * curved-hand-thin sub-leaf's bleed isn't perfectly symmetric after mirroring, so
 * its `expand` differs slightly per hand and is passed in rather than hardcoded.
 */
const greenHand = (
  Hand: Leaf['Art'],
  Mitten: Leaf['Art'],
  size: Size,
  handExpand: Inset
): Size & { leaves: Leaf[] } => ({
  ...size,
  leaves: [
    { Art: Hand, inset: [0, 53.33, 41.11, 34.43], expand: handExpand },
    {
      Art: Mitten,
      inset: [41.17, 13.96, 6.11, -2.97],
      hypot: { width: [46.0896, 72.7665], height: [-73.9823, 51.5833] },
      rotate: 56.39,
    },
  ],
});

const GREEN_INNER: readonly Leaf[] = [
  { Art: GreenBody1, inset: [13.72, 18.75, 4.31, 18.75] },
  { Art: GreenBody2, inset: [13.93, 19.14, 4.39, 21.06] },
  {
    Art: GreenHair,
    inset: [12.63, 31.26, 40.42, 21.92],
    hypot: { width: [73.6612, 8.50399], height: [-13.7201, 86.5459] },
    rotate: 8.72,
    skewX: 1.92,
    expand: [0, -7.8, 0, -7.61],
  },
  { Art: GreenLandscape, inset: [64.17, 18.99, 4.17, 18.99] },
  {
    // Raised right hand.
    inset: [38.36, 1.01, 41.06, 67.65],
    hypot: { width: [-39.1272, -41.7586], height: [59.3387, -61.9615] },
    rotate: -136.18,
    skewX: -2.99,
    board: greenHand(GreenHand1, GreenMitten1, { width: 32.724, height: 49.079 }, [-6.91, -49.89, -6.91, -49.89]),
  },
  { Art: GreenArm, inset: [94.88, 9.53, 1.46, 8.4], expand: [-119.99, -7.7, -119.99, -7.7] },
  { Art: GreenFace, inset: [36.5, 34.15, 47.98, 35.28] },
  {
    // Ground shadow: the outer frame only clips, so the inner box is pre-resolved.
    Art: GreenShadow,
    box: { left: 51.97, top: 251.75, width: 85.86, height: 8.05 },
    expand: [-196.93, -18.4, -196.93, -18.4],
  },
  {
    // Raised left hand — the same component, mirrored.
    inset: [33.48, 65.28, 42.34, 4.05],
    hypot: { width: [61.5242, -22.5379], height: [-48.3381, -79.6832] },
    rotate: 155.89,
    skewX: -2.31,
    flipX: true,
    board: greenHand(GreenHand2, GreenMitten2, { width: 38.33, height: 59.17 }, [-5.9, -45.77, -5.9, -45.73]),
  },
  {
    Art: GreenBrow,
    inset: [34.93, 36.41, 62.49, 58.07],
    hypot: { width: [86.6056, 34.5362], height: [-12.3393, 53.6878] },
    rotate: 16.77,
    skewX: -0.16,
  },
  {
    Art: GreenBlush,
    inset: [49.58, 29.71, 45.74, 30.49],
    hypot: { width: [99.9361, 26.9311], height: [-0.733363, 30.8459] },
    rotate: 4.55,
    skewX: -0.04,
    expand: [-56.87, -5.24, -56.87, -5.24],
  },
  {
    Art: GreenSparkle,
    box: { left: 124.75, top: 19.51, width: 15.547, height: 14.536 },
    size: { width: 13.422, height: 13.013 },
    rotate: -7.35,
    skewX: 2.55,
    expand: [0.51, 0.61, 0.61, 0.61],
  },
  {
    Art: GreenStarA,
    box: { left: 129.81, top: 12.76, width: 2.702, height: 6.691 },
    size: { width: 1.916, height: 6.505 },
    rotate: -7.08,
    expand: [5.3, -51.36, -13.38, -45.92],
  },
  {
    Art: GreenStarB,
    box: { left: 133.68, top: 34.97, width: 4.446, height: 6.712 },
    size: { width: 1.916, height: 6.505 },
    rotate: 155.43,
    expand: [5.3, -51.36, -13.38, -45.92],
  },
];

export const GREEN: CharacterArt = {
  size: { width: 220.6, height: 292.8 },
  leaves: [
    {
      box: { left: 0, top: 0, width: 220.6, height: 292.8 },
      size: { width: 187.42, height: 271.1 },
      rotate: 7.31,
      clip: true,
      board: { width: 187.42, height: 271.1, leaves: GREEN_INNER },
    },
  ],
};

// ---------------------------------------------------------------------------
// Yellow — the centrepiece. Figma positions its leaves in frame coordinates, so
// these boxes are the frame values less the group origin (117, 435.58).
// ---------------------------------------------------------------------------

export const YELLOW: CharacterArt = {
  size: { width: 218.365, height: 179.612 },
  leaves: [
    {
      Art: YellowShadow,
      box: { left: 11.466, top: 157.077, width: 162.786, height: 22.535 },
      expand: [-52.8, -7.28, -52.8, -7.28],
    },
    { Art: YellowStem, box: { left: 38.22, top: 67.528, width: 24.336, height: 7.681 } },
    { Art: YellowBodyHi, box: { left: 0.2, top: 2.62, width: 186.283, height: 173.022 } },
    { Art: YellowBody, box: { left: 0, top: 2.62, width: 186.283, height: 173.022 } },
    { Art: YellowHill1, box: { left: 9.009, top: 101.542, width: 104.52, height: 68.279 } },
    { Art: YellowHill2, box: { left: 10.92, top: 113.358, width: 103.818, height: 56.548 } },
    { Art: YellowPath, box: { left: 84.474, top: 106.437, width: 94.029, height: 58.067 } },
    { Art: YellowPathCenter, box: { left: 72.501, top: 112.429, width: 102.453, height: 55.451 } },
    {
      Art: YellowWhiteFlower,
      box: { left: 32.214, top: 127.284, width: 22.464, height: 21.015 },
      expand: [0, 0, -11.79, 0],
    },
    {
      Art: YellowYellowFlower,
      box: { left: 123.201, top: 135.217, width: 21.567, height: 23.632 },
      expand: [0, -0.76, -6.29, -4.23],
    },
    { Art: YellowEyeLeft, box: { left: 62.478, top: 30.477, width: 33.384, height: 36.967 } },
    { Art: YellowEyeRight, box: { left: 94.185, top: 29.97, width: 34.047, height: 37.812 } },
    {
      Art: YellowBrowRight,
      box: { left: 110.253, top: -0.2, width: 20.475, height: 8.44 },
      hypot: { width: [94.8301, 39.7115], height: [-5.16988, 60.2885] },
      rotate: 9.69,
      skewX: -2.18,
      expand: [-57.6, -35.11, -211.25, -35.11],
    },
    {
      Art: YellowBrowLeft,
      box: { left: 59.709, top: -0.6, width: 19.617, height: 13.082 },
      hypot: { width: [91.3967, -63.4637], height: [8.60333, 36.5363] },
      rotate: -24.66,
      skewX: -5.05,
      expand: [-97.97, -34.98, -176.39, -34.98],
    },
    {
      Art: YellowMouth,
      box: { left: 74.529, top: 72.592, width: 38.922, height: 23.801 },
      hypot: { width: [-98.9831, 3.07914], height: [-1.01693, -96.9209] },
      rotate: 178.92,
      skewX: -0.1,
    },
    { Art: YellowMouthMask, box: { left: 74.529, top: 72.592, width: 38.922, height: 23.801 } },
    {
      // Yellow's own small waving hand, off to the right. Figma's own flattened
      // export (163:1919) is used verbatim here instead of reassembling it from
      // 4 rotated/skewed/expanded leaves — that reconstruction consistently
      // merged the three fingers into a blob for reasons that resisted several
      // rounds of debugging, while the flattened export is pixel-exact by
      // construction. Box is centred on the hand's measured ink bounds in the
      // full-slide render, since the export's bbox is the bled visual extent,
      // not the nominal (pre-bleed) layout box.
      Art: YellowHandFull,
      box: { left: 176, top: 35.92, width: 40, height: 50 },
    },
  ],
};

// ---------------------------------------------------------------------------
// Yellow's waving left arm — animated separately, so it is its own board.
//
// This is yellow's arm, not pink's: the asset sits at slide (85, 473.5), against
// yellow's body, mirroring the static right arm in `YELLOW` above. Figma's layer
// naming (and this file, until now) attributed it to pink, whose own arm is the
// separate `PinkArmFull` leaf further left.
// ---------------------------------------------------------------------------

// Figma's own flattened export (163:1934) is used verbatim, same rationale as
// yellow's right arm above — reassembling this from 4 rotated/skewed/expanded
// leaves (plus the outer rotate/skew/flipY) consistently merged the fingers into
// a blob. Note it is a whole arm, shoulder to fingers, not just a hand: the
// shoulder stub ends at art (41.5, 47), which is what `WAVE_ORIGIN` pivots about.
// `size` is the export's own bled bounding box, not the nominal (pre-bleed)
// layout box; `WAVE_LAYER.rect` in motion.ts is placed to match.
export const WAVING_ARM: CharacterArt = {
  size: { width: 45, height: 48 },
  leaves: [{ Art: YellowArmFull, box: { left: 0, top: 0, width: 45, height: 48 } }],
};
