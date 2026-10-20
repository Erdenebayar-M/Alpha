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

export const fontSize = { title: 56, plus: 64 } as const;

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
