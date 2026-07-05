// Design tokens sourced from the Figma "Orthography" file (Audio task screens).
export const colors = {
  // Surfaces
  background: '#F8FBFF',
  card: '#FFFFFF',
  sheet: '#FFFFFF',
  sheetBorder: '#E8EEF7',

  // Text
  textNavy: '#30374A',
  textPrompt: '#2F3A4A',
  textChoice: '#24428F',
  textMuted: '#9CA3AF',
  white: '#FFFFFF',

  // Header / progress
  progressText: '#4338CA',
  progressTrack: '#E1E4FF',
  progressFill: '#6D63FF',
  backButtonBg: '#E1E4FF',
  backButtonIcon: '#4338CA',

  // Pastel word chips (Figma "Pastel background" variable) — sentence tokens,
  // draggable punctuation mark.
  pastelBg: '#FFF7FC',
  // Orange text-caret shown at the gap a dragged mark will drop into.
  dropCaret: '#FF7A1A',

  // Choice cards
  choiceBg: '#F8FBFF',
  choiceBorder: '#D8E3F5',
  choiceSelectedBg: '#2E5BE8',
  choiceSelectedBorder: '#4F7DFF',
  primaryBlue: '#2E5BE8',
  border: '#D8E3F5',

  // Matching / link-words task: a linked word card fills lavender.
  matchLockedBg: '#E1E4FF',

  // Audio controls
  sliderThumb: '#30374A',
  sliderActive: '#30374A',
  sliderTrack: '#E1E4FF',
  pillTrack: 'rgba(217, 217, 217, 0.2)',
  pillTextActive: '#30374A',
  pillTextInactive: 'rgba(48, 55, 74, 0.4)',
  pillActiveBg: 'rgba(109, 99, 255, 0.14)',

  // Listening sound-wave bars (inner -> outer)
  wave: ['#a59ff1', '#5088ee', '#c2d6f8', '#ffe4f5'],
} as const;
