import type { Leaf, Size } from '@/src/features/onboarding/FigmaBoard';

// Pink mascot ("pinky_mountain_default_no_legs_editable")
import PinkArm from '@/assets/onboarding/slide1/pink/arm-line.svg';
import PinkBlush from '@/assets/onboarding/slide1/pink/blush.svg';
import PinkBody from '@/assets/onboarding/slide1/pink/body.svg';
import PinkBrow from '@/assets/onboarding/slide1/pink/brow.svg';
import PinkEdge1 from '@/assets/onboarding/slide1/pink/edge1.svg';
import PinkEdge2 from '@/assets/onboarding/slide1/pink/edge2.svg';
import PinkEyeLeft from '@/assets/onboarding/slide1/pink/eye-left.svg';
import PinkEyeRight from '@/assets/onboarding/slide1/pink/eye-right.svg';
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
import GreenFace from '@/assets/onboarding/slide1/green/face.svg';
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
import YellowEyeLeft from '@/assets/onboarding/slide1/yellow/eye-left.svg';
import YellowEyeRight from '@/assets/onboarding/slide1/yellow/eye-right.svg';
import YellowHandA from '@/assets/onboarding/slide1/yellow/hand-a.svg';
import YellowHandArm from '@/assets/onboarding/slide1/yellow/hand-arm.svg';
import YellowHandB from '@/assets/onboarding/slide1/yellow/hand-b.svg';
import YellowHandC from '@/assets/onboarding/slide1/yellow/hand-c.svg';
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

// The pink mascot's waving hand — its own animated layer, so its own board.
import HandA from '@/assets/onboarding/slide1/hand/a.svg';
import HandArm from '@/assets/onboarding/slide1/hand/arm.svg';
import HandB from '@/assets/onboarding/slide1/hand/b.svg';
import HandC from '@/assets/onboarding/slide1/hand/c.svg';

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
    expand: [-21.19, -19.19, -17.73, -30.95],
  },
  {
    Art: PinkEyeRight,
    box: { left: 109.73, top: 76.36, width: 22.709, height: 30.214 },
    expand: [-10.02, -5.94, -13.24, -14.41],
  },
  { Art: PinkBlush, inset: [54.46, 32.52, 42.02, 32.72], expand: [-63.32, -5.3, -63.3, -5.3] },
  {
    Art: PinkMouth,
    inset: [56.37, 42.7, 17.7, 33.69],
    hypot: { width: [90.3685, 16.5663], height: [-20.2895, 83.2949] },
    rotate: 10.46,
  },
  {
    Art: PinkBrow,
    inset: [56.66, 44.36, 34.71, 44.81],
    hypot: { width: [85.6785, -12.982], height: [6.56559, 59.4006] },
    rotate: -7.25,
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
      Art: PinkArm,
      inset: [56.31, 79.9, 38.66, 4.51],
      hypot: { width: [85.9535, -44.2257], height: [14.0465, 55.7743] },
      rotate: -19.71,
      expand: [-3.93, -1.78, -3.93, -1.78],
    },
  ],
};

// ---------------------------------------------------------------------------
// Green — the tallest, arms raised. Both hands share one sub-frame shape.
// ---------------------------------------------------------------------------

/** Both of green's hands are the same Figma component, mirrored. */
const greenHand = (Hand: Leaf['Art'], Mitten: Leaf['Art'], size: Size): Size & { leaves: Leaf[] } => ({
  ...size,
  leaves: [
    { Art: Hand, inset: [0, 53.33, 41.11, 34.43], expand: [-6.91, -49.89, -6.91, -49.89] },
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
    expand: [0, -7.8, 0, -7.61],
  },
  { Art: GreenLandscape, inset: [64.17, 18.99, 4.17, 18.99] },
  {
    // Raised right hand.
    inset: [38.36, 1.01, 41.06, 67.65],
    hypot: { width: [-39.1272, -41.7586], height: [59.3387, -61.9615] },
    rotate: -136.18,
    board: greenHand(GreenHand1, GreenMitten1, { width: 32.72, height: 49.09 }),
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
    flipX: true,
    board: greenHand(GreenHand2, GreenMitten2, { width: 38.33, height: 59.17 }),
  },
  {
    Art: GreenBrow,
    inset: [34.93, 36.41, 62.49, 58.07],
    hypot: { width: [86.6056, 34.5362], height: [-12.3393, 53.6878] },
    rotate: 16.77,
  },
  {
    Art: GreenBlush,
    inset: [49.58, 29.71, 45.74, 30.49],
    hypot: { width: [99.9361, 26.9311], height: [-0.733363, 30.8459] },
    rotate: 4.55,
    expand: [-56.87, -5.24, -56.87, -5.24],
  },
  {
    Art: GreenSparkle,
    box: { left: 124.75, top: 19.51, width: 15.547, height: 14.536 },
    size: { width: 13.422, height: 13.013 },
    rotate: -7.35,
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

const YELLOW_HAND: readonly Leaf[] = [
  {
    Art: YellowHandA,
    inset: [15.16, 14.05, 66.06, 62.92],
    hypot: { width: [85.9498, 16.4611], height: [-113.985, 87.1961] },
    rotate: 21.68,
    expand: [-54.06, -86.76, -60.16, -133.53],
  },
  {
    Art: YellowHandB,
    inset: [10.62, 47.69, 66.28, 30.61],
    hypot: { width: [36.761, -9.69927], height: [27.848, 104.435] },
    rotate: -11.85,
    expand: [-42.07, -71.35, -49.17, -118.76],
  },
  {
    Art: YellowHandC,
    inset: [37.09, -0.02, 55.98, 77.36],
    hypot: { width: [2.83492, 47.3166], height: [-90.9165, 7.49603] },
    rotate: 85.04,
    expand: [-62.52, -116.47, -73.92, -173.97],
  },
  {
    Art: YellowHandArm,
    inset: [39.74, 19.77, -51.76, -153.44],
    hypot: { width: [10.513, 8.01671], height: [-146.884, 62.5652] },
    rotate: 47.11,
    expand: [-5.51, -59.42, -5.51, -59.43],
  },
];

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
      box: { left: 110.253, top: -3.705, width: 20.475, height: 8.44 },
      hypot: { width: [94.8301, 39.7115], height: [-5.16988, 60.2885] },
      rotate: 9.69,
      expand: [-57.6, -35.11, -211.25, -35.11],
    },
    {
      Art: YellowBrowLeft,
      box: { left: 59.709, top: -4.127, width: 19.617, height: 13.082 },
      hypot: { width: [91.3967, -63.4637], height: [8.60333, 36.5363] },
      rotate: -24.66,
      expand: [-97.97, -34.98, -176.39, -34.98],
    },
    {
      Art: YellowMouth,
      box: { left: 74.529, top: 72.592, width: 38.922, height: 23.801 },
      hypot: { width: [-98.9831, 3.07914], height: [-1.01693, -96.9209] },
      rotate: 178.92,
    },
    { Art: YellowMouthMask, box: { left: 74.529, top: 72.592, width: 38.922, height: 23.801 } },
    {
      // Yellow's own small waving hand, off to the right.
      box: { left: 188.8, top: 35.72, width: 29.565, height: 27.653 },
      size: { width: 18.108, height: 23.908 },
      rotate: -25.18,
      board: { width: 18.108, height: 23.908, leaves: YELLOW_HAND },
    },
  ],
};

// ---------------------------------------------------------------------------
// Pink's waving hand — animated separately, so it is its own board.
// ---------------------------------------------------------------------------

export const WAVING_HAND: CharacterArt = {
  size: { width: 25.867, height: 30.03 },
  leaves: [
    {
      box: { left: 3.88, top: 2.02, width: 18.099, height: 25.991 },
      size: { width: 12.345, height: 22.782 },
      rotate: -160.37,
      flipY: true,
      board: {
        width: 12.345,
        height: 22.782,
        leaves: [
          {
            Art: HandA,
            inset: [7.29, 27.44, 63, 41.54],
            hypot: { width: [56.4314, 9.55547], height: [-129.14, 87.2245] },
            rotate: 29.85,
            expand: [-38.3, -182.21, -38.3, -182.35],
          },
          {
            Art: HandB,
            inset: [3.41, 55.59, 67.78, 14.21],
            hypot: { width: [42.9518, -8.8637], height: [30.8991, 92.1507] },
            rotate: -14.87,
            expand: [-34.09, -46.85, -38.51, -83.39],
          },
          {
            Art: HandC,
            inset: [34.01, 1.44, 60.78, 48.6],
            hypot: { width: [0.738212, 21.9536], height: [-104.351, 15.3298] },
            rotate: 86.45,
            expand: [-40.58, -352.15, -40.67, -357.52],
          },
          {
            Art: HandArm,
            inset: [41.69, 49.72, -53.55, -244.94],
            hypot: { width: [8.22429, 15.6274], height: [-112.472, 57.1628] },
            rotate: 65.59,
            expand: [-6.36, -41.3, -6.36, -41.3],
          },
        ],
      },
    },
  ],
};
