import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Neutral grey of the dashed slot outline (Figma "answer-row"). Kept local like the
// other renderers' one-off greys (e.g. FillBlank's slot border).
const DASHED = '#D1D5DB';
const GAP = 12;
const MAX_SLOT = 56;
const MIN_SLOT = 34;

interface WordSlotsProps {
  /** One entry per slot: the placed letter, or null when empty. */
  letters: (string | null)[];
  /** Tap a filled slot to clear that letter (re-packs the rest left). */
  onClearSlot: (index: number) => void;
  /** Once answered the slots freeze (no more editing). */
  isAnswered: boolean;
}

/**
 * The row of dashed answer slots for the assemble-the-word task. Slots shrink to keep
 * the whole word on one line where possible (a 9-letter word still fits), then wrap.
 * A filled slot is tappable to clear its letter; empty slots are inert.
 */
export default function WordSlots({ letters, onClearSlot, isAnswered }: WordSlotsProps) {
  const { width } = useWindowDimensions();
  const count = Math.max(letters.length, 1);
  // Fit the row to the screen: (available width - inter-slot gaps) / count, clamped.
  const available = width - 32; // container horizontal padding (16 each side)
  const raw = Math.floor((available - GAP * (count - 1)) / count);
  const slotSize = Math.max(MIN_SLOT, Math.min(MAX_SLOT, raw));
  const fontSize = Math.round(slotSize * 0.5);

  return (
    <View style={styles.row}>
      {letters.map((letter, index) => {
        const filled = letter !== null;
        return (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.slot,
              { width: slotSize, height: slotSize + 8 },
              filled && styles.slotFilled,
              pressed && filled && !isAnswered && styles.slotPressed,
            ]}
            onPress={() => onClearSlot(index)}
            disabled={!filled || isAnswered}
            accessibilityRole="button"
            accessibilityLabel={filled ? `${letter}, устгах` : 'хоосон нүд'}
          >
            <Text style={[styles.slotText, { fontSize }]}>{letter ?? ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GAP,
  },
  slot: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: DASHED,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    borderColor: colors.choiceSelectedBorder,
  },
  slotPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  slotText: {
    fontFamily: fonts.black,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.056,
  },
});
