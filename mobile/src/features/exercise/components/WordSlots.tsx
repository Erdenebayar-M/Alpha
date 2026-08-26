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
  /** Fixed slot size instead of the width-driven auto-fit (a drag-drop screen with a
   *  small, known slot count wants Figma's exact 76x54 rather than the auto-shrink). */
  slotWidth?: number;
  slotHeight?: number;
  /** Collects each slot's node for measureInWindow-based drop-target hit testing. */
  slotRef?: (index: number, node: View | null) => void;
  /** Highlights the slot a dragged tile currently hovers over. */
  hoveredIndex?: number | null;
  /** Empty slots render with no fill (Figma's drag-drop screen) instead of the
   *  default white fill the tap-to-place screens use. Default false. */
  transparentWhenEmpty?: boolean;
}

/**
 * The row of dashed answer slots for the assemble-the-word task. Slots shrink to keep
 * the whole word on one line where possible (a 9-letter word still fits), then wrap.
 * A filled slot is tappable to clear its letter; empty slots are inert.
 */
export default function WordSlots({
  letters,
  onClearSlot,
  isAnswered,
  slotWidth,
  slotHeight,
  slotRef,
  hoveredIndex = null,
  transparentWhenEmpty = false,
}: WordSlotsProps) {
  const { width } = useWindowDimensions();
  const count = Math.max(letters.length, 1);
  // Fit the row to the screen: (available width - inter-slot gaps) / count, clamped.
  const available = width - 32; // container horizontal padding (16 each side)
  const raw = Math.floor((available - GAP * (count - 1)) / count);
  const autoSize = Math.max(MIN_SLOT, Math.min(MAX_SLOT, raw));
  const w = slotWidth ?? autoSize;
  const h = slotHeight ?? autoSize + 8;
  const fontSize = Math.round(Math.min(w, h) * 0.5);

  return (
    <View style={styles.row}>
      {letters.map((letter, index) => {
        const filled = letter !== null;
        const hovered = hoveredIndex === index;
        return (
          <Pressable
            key={index}
            ref={slotRef ? (node) => slotRef(index, node) : undefined}
            collapsable={slotRef ? false : undefined}
            style={({ pressed }) => [
              styles.slot,
              transparentWhenEmpty && styles.slotTransparent,
              { width: w, height: h },
              filled && styles.slotFilled,
              hovered && !filled && styles.slotHovered,
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
  slotTransparent: {
    backgroundColor: 'transparent',
  },
  slotFilled: {
    borderColor: colors.choiceSelectedBorder,
    backgroundColor: colors.white,
  },
  slotHovered: {
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
