import { StyleSheet } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Shared StyleSheet fragments for the exercise renderers in ./renderers.
 * Nearly every renderer wraps its content in the same
 * container/scroll/prompt shell (`flex:1, paddingHorizontal:16,
 * paddingBottom:8` / `flex:1` / the 16px black prompt text) — this factors
 * out the byte-identical rules so a shared change (re-tuning padding, the
 * prompt's type ramp) is one edit instead of one per renderer.
 */
export const exerciseStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  prompt: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: colors.textPrompt,
    textAlign: 'center',
    letterSpacing: -0.032,
  },
});

interface ExerciseContentOptions {
  /** The one property renderers actually vary. */
  gap: number;
  /** Omit for RN's default `alignItems: 'stretch'` — several renderers
   *  (CommaPlace, MatchPairs, PunctuationPlace, SentenceCapital,
   *  SentencePunctuation, TapFindError) rely on that default rather than
   *  centering, so this must stay opt-in, not a fixed 'center'. */
  align?: 'center';
  /** Defaults to 'space-evenly', the most common case. */
  justify?: 'center' | 'space-evenly';
}

/** The renderers' scrollable `contentContainerStyle`. Not run through
 *  StyleSheet.create since `gap` varies per call. */
export function exerciseContent({ gap, align, justify = 'space-evenly' }: ExerciseContentOptions) {
  return {
    flexGrow: 1 as const,
    ...(align ? { alignItems: align } : null),
    justifyContent: justify,
    paddingVertical: 10,
    gap,
  };
}
