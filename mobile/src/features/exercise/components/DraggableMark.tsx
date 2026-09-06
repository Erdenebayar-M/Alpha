import { StyleSheet, Text } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useDragPan } from '@/src/features/exercise/hooks/useDragPan';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface DraggableMarkProps {
  mark: string;
  disabled?: boolean;
  /** Fired when the drag begins (renderer re-measures the gap drop targets). */
  onDragStart: () => void;
  /** Fired continuously with the finger's screen position (drives gap hover). */
  onDragMove: (x: number, y: number) => void;
  /** Fired on release with the finger's screen position; renderer places the mark. */
  onDrop: (x: number, y: number) => void;
}

/**
 * The punctuation mark the child drags into the sentence. It's an infinite
 * dispenser: the tile follows the finger (lifting + growing so it reads as picked
 * up) and always springs back to its slot on release, so more marks can be dragged
 * for sentences that need several. Built on the same Pan + Reanimated pattern as
 * DraggableImageCard.
 */
export default function DraggableMark({
  mark,
  disabled = false,
  onDragStart,
  onDragMove,
  onDrop,
}: DraggableMarkProps) {
  // Infinite source: always returns home on release (via useDragPan's onFinalize) so
  // another mark can be dragged. Fades while picked up so the orange drop-caret in the
  // gap underneath stays visible through it (the tile sits on top of the target).
  const { pan, style } = useDragPan({
    enabled: !disabled,
    scaleBoost: 0.12,
    shadowOpacity: [0.14, 0.24],
    shadowRadius: [9, 10],
    fade: 0.5,
    onDragStart,
    onDragMove,
    onDrop,
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.tile, style]}>
        <Text style={styles.mark}>{mark}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 80,
    height: 80,
    borderRadius: 120,
    backgroundColor: colors.pastelBg,
    borderWidth: 1,
    borderColor: colors.choiceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F7DFF',
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  mark: {
    fontFamily: fonts.extrabold,
    fontSize: 34,
    lineHeight: 40,
    color: colors.textChoice,
    letterSpacing: -0.048,
    // nudge the low-baseline glyph (".", ",") toward the visual centre of the tile
    marginTop: -14,
  },
});
