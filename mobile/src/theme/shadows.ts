import type { ViewStyle } from 'react-native';

type Shadow = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

/**
 * Shadow recipes that were re-typed identically across many `StyleSheet.create`
 * blocks in src/features/exercise. Consolidated from AnswerInput.tsx,
 * ChoiceGrid.tsx, LetterTileBar.tsx and the exercise renderers, which
 * previously each defined their own (some already byte-identical to each
 * other) — same pattern as colors.ts's own feedback-color consolidation note.
 */
export const shadows = {
  /** The white content card under Correction/CopyText/SentenceFill/
   *  VisualMemory/SelfCheck/CommaPlace/PunctuationPlace/TapFindError. */
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  } satisfies Shadow,

  /** The bottom-docked answer sheet (AnswerInput/ChoiceGrid/LetterTileBar),
   *  the audio-controls card, the syllable tray, and the two punctuation
   *  dispensers — identical color/offset/opacity/radius; only `elevation`
   *  varies by how far each one floats above its neighbours. */
  sheet(elevation: number): Shadow {
    return {
      shadowColor: '#2C4064',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation,
    };
  },

  /** The smaller sheet shadow used only by the backspace/delete tile beside
   *  CommaPlace/PunctuationPlace's mark dispenser. */
  sheetSmall: {
    shadowColor: '#2C4064',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  } satisfies Shadow,

  /** The hairline shadow along a docked sheet's own top edge — its inner
   *  field/card/tile, not the sheet itself (AnswerInput/ChoiceGrid/
   *  LetterTileBar). */
  sheetEdge: {
    shadowColor: '#283C64',
    shadowOffset: { width: -1, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  } satisfies Shadow,

  /** The inset look of a fill-in-the-blank letter slot (FillBlank, FillLetter,
   *  WordWithBlanks). */
  slot: {
    shadowColor: '#283C64',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  } satisfies Shadow,
} as const;
