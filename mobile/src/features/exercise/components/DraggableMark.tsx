import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0); // 0 = resting, 1 = picked up

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      lift.value = withTiming(1, { duration: 120 });
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
      runOnJS(onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      runOnJS(onDrop)(e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      // Infinite source: always return home so another mark can be dragged.
      tx.value = withSpring(0, { damping: 18, stiffness: 220 });
      ty.value = withSpring(0, { damping: 18, stiffness: 220 });
      lift.value = withTiming(0, { duration: 160 });
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: 1 + lift.value * 0.12 },
    ],
    zIndex: lift.value > 0 ? 50 : 1,
    // Fade the tile while it's picked up so the orange drop-caret in the gap
    // underneath stays visible through it (the tile sits on top of the target).
    opacity: 1 - lift.value * 0.5,
    shadowOpacity: 0.14 + lift.value * 0.24,
    shadowRadius: 9 + lift.value * 10,
  }));

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
