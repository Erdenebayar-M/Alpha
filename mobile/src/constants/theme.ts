/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Dimensions, Platform } from 'react-native';

/**
 * Responsive sizing. Style values are density-independent points, but phones differ in
 * logical width — so fixed sizes drift across devices. Scale fixed-size art (globe, icons,
 * min-heights, fonts) off the Figma frame width instead of hardcoding magic numbers.
 *
 * Layout structure should still lean on flex/percentages; use these only for concrete sizes.
 * `Dimensions.get` is a snapshot — fine for this portrait-locked app; switch to the
 * `useWindowDimensions()` hook if rotation/foldables ever matter.
 */
const GUIDELINE_WIDTH = 393; // Figma frame width — confirm in Dev Mode.
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Linear scale to screen width — use for widths/diameters. */
export const scale = (size: number) => (SCREEN_WIDTH / GUIDELINE_WIDTH) * size;
/** Dampened scale — use for font sizes and min-heights you don't want to grow as hard. */
export const ms = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Brand palette for the ОРТО kids' app. This is a fixed light-theme product, so
 * these are flat tokens (not light/dark pairs). Values are read from the Figma
 * screenshots and must be reconciled against Figma Dev Mode tokens — keep this
 * the single source of truth; never hardcode these in a component.
 */
export const Brand = {
  /** Deep navy used for headings / logo. */
  navy: '#34487E',
  /** Primary CTA blue. */
  primary: '#3B57E0',
  /** Lighter blue used for progress fill, selected outlines, audio control. */
  accentBlue: '#5B8DEF',
  /** Warm yellow/orange sparkles + accents. */
  accentWarm: '#F5A623',

  /** Landing screen background (top → bottom of the blue gradient). */
  landingTop: '#EAF4FB',
  landingBottom: '#DCEBF7',
  /** Diagnostic screen background (warm cream). */
  diagnosticBg: '#F6F1ED',
  /** Listen-&-choose screen background (light blue/white). */
  listenBg: '#F3F7FC',

  /** Surfaces. */
  card: '#FFFFFF',
  pill: '#ECEEF1',
  progressTrack: '#E7E1DC',
  /** Dark progress track + purple fill for the listen screen (pages 6–8). */
  progressTrackDark: '#2E3848',
  progressFillPurple: '#8B7DF0',

  /** Text. */
  textPrimary: '#34487E',
  textBody: '#3A3A3A',
  textMuted: '#6B7280',
  greeting: '#8A8497',
  onPrimary: '#FFFFFF',

  /** Answer option states. */
  optionBorder: '#E5E0DB',
  /** Cool light-gray border for the listen screen's cards/options (pages 6–8). */
  optionBorderCool: '#EBEDF2',
  optionSelectedBorder: '#5B8DEF',
  optionSelectedTint: '#EEF3FE',
} as const;

export type BrandColor = keyof typeof Brand;

/** Corner radii. */
export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  pill: 999,
} as const;

/**
 * Typography scale for Mongolian Cyrillic copy. `family: undefined` resolves to
 * the system font for now — swapping in the bundled Mongolian font later is a
 * one-line change here (set `family` to the loaded font name).
 */
export const Typography = {
  family: undefined as string | undefined,
  title: { fontSize: 26, lineHeight: 34, fontWeight: '700' },
  subtitle: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  greeting: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  option: { fontSize: 18, lineHeight: 24, fontWeight: '500' },
  button: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  pill: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
} as const;
