// Design tokens. Components never hold raw colours, sizes or font names.
// Palette is keyed to the four characters so each World can borrow its host's colour.
export const colors = {
  sky: '#BFE6FF',
  skyDeep: '#5AA8F0', // Orto
  sun: '#FFC93C', // Narhan
  leaf: '#7ED957', // Sprout
  ember: '#FF9F43', // Buddy
  steppe: '#B8E07A',
  ink: '#1E2A3A',
  white: '#FFFFFF',
  shadow: 'rgba(30, 42, 58, 0.18)',
  success: '#4CC38A',
  softRed: '#FF8A80',
  vowel: '#FFE8A3',
  consonant: '#CFE8FF',
  placeholderInk: '#7A8699',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const radii = { md: 20, lg: 32, pill: 999 } as const;

// Smallest tappable size for small fingers (mobile/AGENTS.md §8 asks ~64; we go bigger).
export const touchMin = 72;

/** One bubble size for every child-facing round button (avatars, "+", choices). */
export const bubble = touchMin * 1.8;
/** How much of a bubble its character art fills. */
export const bubbleArt = 0.8;

export const characterSize = { hero: 180, map: 160 } as const;

export const fontSize = { icon: 36, title: 56, plus: 64 } as const;

/** Letter tiles and picture cards in Games. */
export const tile = {
  size: 120,
  fontRatio: 0.6,
  dimmedOpacity: 0.35,
  pictureSize: 200,
  placeholderFontRatio: 0.22,
} as const;

export const drag = {
  /** zIndex of a lifted piece. It only beats its siblings: a Game must also raise the piece's container. */
  liftZ: 50,
  restZ: 1,
  liftMs: 140,
  liftScale: 0.12,
  spring: { damping: 18, stiffness: 220 },
} as const;

export const feedback = { shakeDistance: 12, shakeStepMs: 60, popScale: 0.25, popMs: 180 } as const;

export const motion = {
  pressScale: 0.94,
  /** Idle bob height as a fraction of the character's size, and half-cycle length. */
  bobHeight: 0.04,
  bobMs: 900,
} as const;

export const fonts = {
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export const shadow = {
  shadowColor: colors.ink,
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;

/** Hear & Tap: the three choice tiles and the pause between rounds. */
export const hearTap = {
  tileMax: 200,
  /** Pause after a correct tap, long enough for the pop to land, before the next round. */
  nextMs: 450,
} as const;

/** Sound Sort: baskets, the centre card, and the beat before the Game ends. */
export const sortGame = {
  /** Card edge as a fraction of the game area's height, capped at tile.pictureSize. */
  cardRatio: 0.5,
  /** Basket letter tile edge as a fraction of the game area's height, capped at tile.size. */
  tileRatio: 0.22,
  /** Sorted-word thumbnails as a fraction of the card edge. */
  placedRatio: 0.25,
  borderWidth: 4,
  /** Let the last pop land before the Game reports its result. */
  finishMs: 700,
} as const;

/** Blend & Pick: the slide track under the tiles, the active-tile lift and the pick pop. */
export const blend = {
  /** Gap between neighbouring tiles; each tile owns one equal slice of the track. */
  tileGap: 16,
  /** Touch height of the track (taller than the rail, so any finger can slide it). */
  trackHeight: 120,
  railHeight: 28,
  knobSize: 88,
  /** Last share of the track whose touch means "I reached the end". */
  endZone: 0.12,
  activeScale: 1.12,
  /** Largest share of the play area's height a tile row / a picture row may take. */
  tileHeightShare: 0.25,
  cardHeightShare: 0.35,
} as const;

/** Build the Word: the empty slots. */
export const buildWord = {
  slotBorder: 4,
  slotFill: 'rgba(255, 255, 255, 0.55)',
} as const;

/** Trace: the guide, ink and start marker are sized as shares of the square board. */
export const trace = {
  reps: 3,
  /** Reach a checkpoint within this (0–1 board units); farther than tolerance × strayFactor from the path resets the stroke. */
  tolerance: 0.12,
  strayFactor: 2,
  boardHeightShare: 0.75,
  guideWidth: 0.13,
  inkWidth: 0.1,
  guideOpacity: 0.14,
  markerSize: 0.2,
  markerDot: 0.18,
  pulseScale: 1.18,
  pulseMs: 600,
  /** Start marker shape as shares of the marker box: outline width and the arrow triangle. */
  markerOutline: 0.03,
  markerArrow: [[0.68, 0.3], [0.98, 0.5], [0.68, 0.7]],
  repDot: 44,
  repDotOffOpacity: 0.25,
} as const;
