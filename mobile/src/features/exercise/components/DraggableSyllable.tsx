import { StyleSheet, Text } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useDragPan } from '@/src/features/exercise/hooks/useDragPan';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface DraggableSyllableProps {
  text: string;
  /** A used tile stays in the tray (Figma keeps its chrome) but its text fades and
   *  it stops responding to drags — unlike DraggableMark's infinite dispenser, each
   *  syllable is a single-use tile consumed by whichever slot it's dropped in. */
  used?: boolean;
  disabled?: boolean;
  /** Fired when the drag begins (renderer re-measures the slot drop targets). */
  onDragStart: () => void;
  /** Fired continuously with the finger's screen position (drives slot hover). */
  onDragMove: (x: number, y: number) => void;
  /** Fired on release with the finger's screen position; renderer places the tile. */
  onDrop: (x: number, y: number) => void;
}

/**
 * A syllable chip the child drags from the tray into an answer slot (Figma "Үеэр үг
 * бүтээх"). Built on the same Pan + Reanimated pattern as DraggableMark: the tile
 * follows the finger (lifting + growing) and always springs back to its tray position
 * on release — the renderer decides, from the drop coordinates, whether that counts as
 * a successful placement.
 */
export default function DraggableSyllable({
  text,
  used = false,
  disabled = false,
  onDragStart,
  onDragMove,
  onDrop,
}: DraggableSyllableProps) {
  const { pan, style } = useDragPan({
    enabled: !disabled && !used,
    scaleBoost: 0.12,
    shadowOpacity: [0.14, 0.24],
    shadowRadius: [9, 10],
    onDragStart,
    onDragMove,
    onDrop,
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.chip, style]}>
        <Text style={[styles.text, used && styles.textUsed]} numberOfLines={1} adjustsFontSizeToFit>
          {text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    backgroundColor: colors.choiceBg,
    borderWidth: 1,
    borderColor: colors.choiceBorder,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F7DFF',
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  text: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    color: colors.textChoice,
    letterSpacing: -0.048,
    textAlign: 'center',
  },
  textUsed: {
    color: 'rgba(36, 66, 143, 0.45)',
  },
});
