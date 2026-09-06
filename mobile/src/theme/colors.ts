// Design tokens sourced from the Figma "Orthography" file (Audio task screens).
export const colors = {
  // Surfaces
  background: '#F8FBFF',
  card: '#FFFFFF',
  sheet: '#FFFFFF',
  sheetBorder: '#E8EEF7',
  // Hairline rule under a task's character/prompt row (Figma "Line 20").
  divider: '#EAEAEA',

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
  // Speech-bubble fill shared by every character prompt bubble (AssembleWord,
  // FillBlank, FillLetterTiles, MatchPairs, SyllableAssembleWord, CommaPlace,
  // PunctuationPlace, SentenceCapital, SentencePunctuation, LetterChoice) and
  // SpeakerButton's own idle fill — was hardcoded per-file, never in this file.
  bubbleFill: '#E5F2FF',
  // Orange text-caret shown at the gap a dragged mark will drop into.
  dropCaret: '#FF7A1A',
  // Dashed orange ring drawn at each empty comma-drop gap (CommaPlace). Not TT_8_3 —
  // that code is choiceOptions per shared/; see CommaPlace.tsx's header note.
  gapRing: '#FF8C3B',

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

  // Onboarding carousel (Figma 163:1739 / 142:1677 / 142:1839).
  // Slide 1 is a vertical gradient; slides 2-3 sit on the existing `primaryBlue`.
  onboardingGradientTop: '#0B4DFF',
  onboardingGradientBottom: '#052ED6',
  // Brand yellow: the active page-indicator pill and the highlighted word runs.
  brandYellow: '#FBDA2D',
  // Spent page-indicator dots.
  dotInactive: '#BDC8F4',
  // Highlighted word runs on the message slides, sampled from the Figma renders.
  brandYellowBright: '#FEF60D',
  brandGold: '#FCD974',

  // Listening sound-wave bars (inner -> outer)
  wave: ['#a59ff1', '#5088ee', '#c2d6f8', '#ffe4f5'],

  // Profile setup (gender/personal info/grade, Figma 804-8990 / 804-9634 / 804-9969 /
  // 804-10250 / 804-10366 / 825-10618) — runs right after the onboarding carousel.
  // The CTA is one gradient in both states — Figma draws the disabled variant as the
  // same two stops at 20% alpha. SVG `stopColor` has no alpha channel (an `rgba()`
  // string there silently renders fully opaque), so the fade lives in `stopOpacity`.
  profileCtaStart: '#2356F8',
  profileCtaEnd: '#2F5BE4',
  // Same border accent in both the disabled and enabled button states.
  profileCtaBorder: '#4F9EF5',
  profileSelectedCheckBg: '#A4DC6A',
  profileInputBorder: '#ECEEF5',
  profileInputPlaceholder: 'rgba(8, 8, 7, 0.35)',
  profileLabelText: 'rgba(8, 8, 7, 0.8)',
  profileGradePillBg: '#FFFFFF',
  profileGradePillSelectedBg: '#2F5BE4',
  profileGradePillText: '#090909',

  // Journey start (Figma 204:11233) — runs after profile setup at the top of today's lesson.
  journeyCtaStart: '#2F5BFF',
  journeyCtaEnd: '#3361F4',
  journeySubtitle: '#575050',
  journeyDurationText: '#7A8797',
  journeyDurationBg: 'rgba(241, 244, 248, 0.3)',

  // Right/wrong feedback. Each surface uses its own visual weight (a bold
  // filled choice button vs. a pastel chip/field), so these are deliberately
  // NOT one shared pair — but every hex used more than once now lives here
  // instead of being re-typed. Consolidated from MultipleChoice.tsx,
  // TapFindError.tsx and AnswerInput.tsx, which previously each defined their
  // own literals (some of them byte-identical to each other already).
  feedbackCorrectBold: '#16a34a', // MultipleChoice: filled correct choice
  feedbackWrongBold: '#dc2626', // MultipleChoice: filled wrong choice
  feedbackNeutralBorder: '#ccc', // MultipleChoice: unselected choice border
  feedbackCorrectBg: '#DCF7E3', // TapFindError: correct chip fill
  feedbackCorrectBorder: '#34C759', // TapFindError: correct chip border + reveal ring
  feedbackWrongBg: '#FDF1F1', // TapFindError chip / AnswerInput field: wrong fill
  feedbackWrongBorder: '#F0B4B4', // TapFindError chip / AnswerInput field: wrong border
  feedbackCorrectFieldBg: '#EEF4FF', // AnswerInput: correct field fill
} as const;
