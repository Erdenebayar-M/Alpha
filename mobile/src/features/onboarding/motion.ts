import { Easing, type EasingFunction, type EasingFunctionFactory } from 'react-native-reanimated';

/**
 * The slide-1 entrance, transcribed from Figma's own keyframe data
 * (`get_motion_context` on node 163:1739 -> one 3000ms cohort, 22 animated nodes).
 *
 * Figma loops that cohort forever; we play it once and hold, because every track
 * already settles on its final value and stays there — the loop is a preview
 * affordance, not part of the design. The waving hand is the one exception: it
 * keeps its wave as an idle (see WAVE_KEYFRAMES).
 */

/**
 * Figma exports its springs as CSS `linear()` — a 51-point piecewise-linear
 * sample of the real spring, overshoot included. `Easing.bezier` cannot overshoot,
 * so replaying the samples is both simpler and exactly faithful.
 */

/** Gentle spring, peaks at 1.0283 (~46%). Figma uses it only for the background ellipses. */
export const SPRING_A = [
  0, 0.0188, 0.0679, 0.1374, 0.2195, 0.308, 0.3978, 0.4856, 0.5686, 0.6452, 0.7142, 0.7753,
  0.8283, 0.8735, 0.9113, 0.9423, 0.9671, 0.9866, 1.0014, 1.0123, 1.0198, 1.0247, 1.0274,
  1.0283, 1.0281, 1.0268, 1.025, 1.0227, 1.0202, 1.0177, 1.0152, 1.0128, 1.0106, 1.0085,
  1.0068, 1.0052, 1.0039, 1.0028, 1.0018, 1.0011, 1.0005, 1, 0.9997, 0.9995, 0.9993, 0.9992,
  0.9992, 0.9992, 0.9992, 0.9993, 0.9993,
] as const;

/** Bouncier spring, peaks at 1.068 (~36%) — every character, star and sparkle rides this. */
export const SPRING_B = [
  0, 0.0242, 0.0871, 0.1757, 0.2793, 0.3892, 0.4987, 0.6028, 0.6982, 0.7827, 0.8552, 0.9156,
  0.9641, 1.0017, 1.0295, 1.0486, 1.0606, 1.0666, 1.068, 1.0659, 1.0613, 1.0551, 1.048,
  1.0405, 1.0331, 1.026, 1.0197, 1.014, 1.0092, 1.0052, 1.002, 0.9996, 0.9978, 0.9965,
  0.9958, 0.9954, 0.9954, 0.9955, 0.9959, 0.9963, 0.9968, 0.9973, 0.9978, 0.9983, 0.9987,
  0.9991, 0.9994, 0.9997, 0.9999, 1.0001, 1.0002,
] as const;

/**
 * Replays a `linear()` sample as a Reanimated easing. Endpoints are pinned to 0/1
 * so a layer always lands exactly on its target (Figma's tails stop at 0.9993 /
 * 1.0002, which would otherwise leave a sliver of drift behind).
 */
export function makeSampledEasing(points: readonly number[]): EasingFunction {
  const lastIndex = points.length - 1;
  return (t: number) => {
    'worklet';
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const x = t * lastIndex;
    const i = Math.floor(x);
    return points[i] + (points[i + 1] - points[i]) * (x - i);
  };
}

/** cubic-bezier(0.16, 1, 0.3, 1) — every opacity fade in the design, plus two transforms. */
/** Either shape `withTiming` accepts: sampled easings are plain functions, `Easing.bezier` is a factory. */
export type AnyEasing = EasingFunction | EasingFunctionFactory;

export const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_SPRING_A = makeSampledEasing(SPRING_A);
export const EASE_SPRING_B = makeSampledEasing(SPRING_B);

export type Curve = 'expo' | 'springA' | 'springB';

export function easingFor(curve: Curve): AnyEasing {
  switch (curve) {
    case 'springA':
      return EASE_SPRING_A;
    case 'springB':
      return EASE_SPRING_B;
    default:
      return EASE_OUT_EXPO;
  }
}

export type AnimatableProp = 'opacity' | 'translateY' | 'scale' | 'rotate';

/** One property of one layer moving from `from` to `to`. Times are ms from slide activation. */
export interface Track {
  prop: AnimatableProp;
  from: number;
  /** Settle value. Defaults to 1 for opacity/scale and 0 for translateY/rotate. */
  to?: number;
  delay: number;
  duration: number;
  curve: Curve;
}

/** A layer's box in the 390x844 Figma frame, in design px. */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LayerSpec {
  key: string;
  rect: Rect;
  tracks: Track[];
  /** Static rotation baked into the Figma layer, in degrees. Applied under any animated rotate. */
  staticRotate?: number;
  /** Static horizontal/vertical mirror baked into the Figma layer. */
  flipY?: boolean;
}

export const DESIGN = { width: 390, height: 844 } as const;

const fade = (delay: number, duration: number): Track => ({
  prop: 'opacity',
  from: 0,
  delay,
  duration,
  curve: 'expo',
});

/**
 * Slide 1, in Figma paint order (first entry paints furthest back).
 * Every `rect` is derived from the node's own box in the design context; every
 * `track` is a transcription of that node's keyframes, percentages converted to
 * ms against the 3000ms cohort.
 */
export const SLIDE1_LAYERS: readonly LayerSpec[] = [
  {
    key: 'bgBlobRight',
    rect: { left: 295, top: 14, width: 159, height: 140 },
    tracks: [fade(0, 800), { prop: 'scale', from: 0.8, delay: 0, duration: 1200, curve: 'springA' }],
  },
  {
    key: 'bgBlobLeft',
    rect: { left: -114, top: 163, width: 260, height: 260 },
    tracks: [fade(0, 1000), { prop: 'scale', from: 0.7, delay: 0, duration: 1400, curve: 'springA' }],
  },
  {
    key: 'ring',
    rect: { left: 33, top: 314, width: 369, height: 355 },
    tracks: [
      fade(200, 800),
      { prop: 'scale', from: 0.6, delay: 200, duration: 1300, curve: 'springA' },
      // The one long track: the ring keeps easing round for the full 3s while
      // everything else has already settled.
      { prop: 'rotate', from: 15, delay: 0, duration: 3000, curve: 'expo' },
    ],
  },
  {
    key: 'swooshTop',
    rect: { left: 264.72, top: 232.75, width: 115.216, height: 81.67 },
    staticRotate: -20.93,
    tracks: [fade(500, 600)],
  },
  {
    key: 'swooshRight',
    rect: { left: 319, top: 488, width: 77.407, height: 113.508 },
    staticRotate: -73.33,
    tracks: [fade(600, 600)],
  },
  {
    key: 'swooshLeft',
    rect: { left: 22, top: 520.83, width: 71.624, height: 67.275 },
    staticRotate: -142.79,
    flipY: true,
    tracks: [fade(700, 600)],
  },
  {
    key: 'wordmark',
    rect: { left: 42.5, top: 84.2, width: 136.2, height: 64.3 },
    tracks: [
      fade(100, 400),
      { prop: 'translateY', from: -40, delay: 100, duration: 600, curve: 'springB' },
      { prop: 'scale', from: 0.8, delay: 100, duration: 600, curve: 'springB' },
    ],
  },
  {
    key: 'headline',
    rect: { left: 38, top: 120, width: 209.2, height: 133 },
    tracks: [
      fade(250, 420),
      { prop: 'translateY', from: 30, delay: 250, duration: 700, curve: 'expo' },
      { prop: 'scale', from: 0.9, delay: 250, duration: 600, curve: 'springB' },
    ],
  },
  {
    key: 'pink',
    rect: { left: -23.99, top: 322.04, width: 265.209, height: 242.637 },
    tracks: [
      fade(400, 300),
      { prop: 'translateY', from: 40, delay: 400, duration: 700, curve: 'springB' },
      { prop: 'scale', from: 0, delay: 400, duration: 700, curve: 'springB' },
    ],
  },
  {
    key: 'green',
    rect: { left: 183.6, top: 272.4, width: 220.6, height: 292.8 },
    tracks: [
      fade(500, 300),
      { prop: 'translateY', from: 45, delay: 500, duration: 700, curve: 'springB' },
      { prop: 'scale', from: 0, delay: 500, duration: 700, curve: 'springB' },
    ],
  },
  {
    key: 'yellow',
    // Bounding box includes yellow's own small waving hand, which reaches to x=335.4.
    rect: { left: 117, top: 435.58, width: 218.365, height: 179.612 },
    tracks: [
      fade(550, 300),
      { prop: 'translateY', from: 50, delay: 550, duration: 700, curve: 'springB' },
      { prop: 'scale', from: 0, delay: 550, duration: 700, curve: 'springB' },
    ],
  },
  {
    key: 'star1',
    rect: { left: 284, top: 146, width: 38.163, height: 37.848 },
    tracks: [
      fade(700, 250),
      { prop: 'scale', from: 0, delay: 700, duration: 500, curve: 'springB' },
      { prop: 'rotate', from: 90, delay: 700, duration: 600, curve: 'springB' },
    ],
  },
  {
    key: 'star2',
    rect: { left: 339.2, top: 192.13, width: 28.933, height: 30.191 },
    tracks: [
      fade(850, 250),
      { prop: 'scale', from: 0, delay: 850, duration: 500, curve: 'springB' },
      { prop: 'rotate', from: -95.1, to: -5.12, delay: 850, duration: 550, curve: 'springB' },
    ],
  },
  {
    key: 'sparkleLeft',
    rect: { left: 24, top: 352, width: 21.585, height: 21.244 },
    tracks: [fade(750, 200), { prop: 'scale', from: 0, delay: 750, duration: 400, curve: 'springB' }],
  },
  {
    key: 'sparkleBottomRight',
    rect: { left: 328.07, top: 598.93, width: 25.384, height: 26.139 },
    staticRotate: 19.92,
    tracks: [fade(950, 200), { prop: 'scale', from: 0, delay: 950, duration: 400, curve: 'springB' }],
  },
  {
    key: 'sparkleBottomLeft',
    rect: { left: 86.17, top: 586.37, width: 21.051, height: 21.403 },
    staticRotate: 3.86,
    tracks: [fade(1050, 200), { prop: 'scale', from: 0, delay: 1050, duration: 400, curve: 'springB' }],
  },
  {
    key: 'miniStar1',
    rect: { left: 57.65, top: 601.2, width: 31.52, height: 31.86 },
    tracks: [fade(900, 200), { prop: 'scale', from: 0, delay: 900, duration: 400, curve: 'springB' }],
  },
  {
    key: 'miniStar2',
    rect: { left: 69.18, top: 595.2, width: 5.66, height: 7.31 },
    tracks: [fade(1000, 200), { prop: 'scale', from: 0, delay: 1000, duration: 400, curve: 'springB' }],
  },
  {
    key: 'dotRight',
    rect: { left: 356, top: 597, width: 4, height: 5 },
    tracks: [fade(1000, 150), { prop: 'scale', from: 0, delay: 1000, duration: 300, curve: 'springB' }],
  },
  {
    key: 'dotLeft',
    rect: { left: 74, top: 581, width: 4, height: 5 },
    tracks: [fade(1100, 150), { prop: 'scale', from: 0, delay: 1100, duration: 300, curve: 'springB' }],
  },
];

/** The waving hand sits on the pink character and has its own rotate choreography. */
export const WAVE_LAYER = {
  key: 'wavingHand',
  rect: { left: 85.11, top: 496.98, width: 25.867, height: 30.03 },
  fadeDelay: 800,
  fadeDuration: 300,
} as const;

/**
 * Figma holds the hand at -0.191rad until 1000ms then swings it twice, landing back
 * at -0.191rad at 1900ms. Degrees, relative to the hand's resting angle, with the
 * leading hold dropped so the segment can loop cleanly as an idle.
 */
export const WAVE_KEYFRAMES = [
  { deg: -10.94, duration: 0 },
  { deg: -25.96, duration: 300 },
  { deg: -0.97, duration: 200 },
  { deg: -22.98, duration: 200 },
  { deg: -10.94, duration: 200 },
] as const;

/** When the hand starts waving (ms from slide activation). */
export const WAVE_START = 1000;

/** Page indicator: fades in last, over the tail of the character entrance. */
export const PAGE_DOTS_MOTION = { delay: 800, duration: 600 } as const;
