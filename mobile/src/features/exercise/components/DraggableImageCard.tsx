import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import PuzzleCard from '@/src/features/exercise/components/PuzzleCard';

interface DraggableImageCardProps {
  leftId: string;
  width: number;
  height: number;
  imageUrl?: string;
  disabled?: boolean;
  /** Highlight border (used when this row was auto-selected as the forced last pair). */
  selected?: boolean;
  /** Fired when the drag begins (renderer re-measures drop targets + lifts this card). */
  onDragStart: (leftId: string) => void;
  /** Fired continuously with the finger's screen position (drives drop-target hover). */
  onDragMove: (x: number, y: number) => void;
  /** Fired on release with the finger's screen position; renderer attempts the link. */
  onDrop: (leftId: string, x: number, y: number) => void;
}

/**
 * A picture card the child drags onto a word to link them. The card follows the
 * finger (lifting + growing so it reads as a picked-up puzzle piece) and always
 * springs back to its slot on release — if the drop linked, the card reflows into
 * its word's row and this instance unmounts; if not, it settles back home.
 */
export default function DraggableImageCard({
  leftId,
  width,
  height,
  imageUrl,
  disabled = false,
  selected = false,
  onDragStart,
  onDragMove,
  onDrop,
}: DraggableImageCardProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0); // 0 = resting, 1 = picked up

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      lift.value = withTiming(1, { duration: 120 });
      runOnJS(onDragStart)(leftId);
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
      runOnJS(onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      runOnJS(onDrop)(leftId, e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      // Always return to the slot origin; a successful link reflows/unmounts us.
      tx.value = withSpring(0, { damping: 18, stiffness: 220 });
      ty.value = withSpring(0, { damping: 18, stiffness: 220 });
      lift.value = withTiming(0, { duration: 160 });
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: 1 + lift.value * 0.08 },
    ],
    zIndex: lift.value > 0 ? 50 : 1,
    shadowOpacity: 0.05 + lift.value * 0.2,
    shadowRadius: 4 + lift.value * 10,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.base, style]}>
        <PuzzleCard variant="image" width={width} height={height} imageUrl={imageUrl} selected={selected} disabled />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    shadowColor: '#1E2A44',
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
