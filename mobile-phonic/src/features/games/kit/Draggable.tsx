import type { ReactNode } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { drag } from '../../../theme/tokens';
import { useDropZones } from './DropZones';
import { useLatest } from './useLatest';

interface Props {
  children: ReactNode;
  disabled?: boolean;
  onPickUp?: () => void;
  /**
   * Called on release with the DropZone id under the finger (or null). The piece always
   * springs back to where it lives in the layout; the Game decides what a drop means —
   * e.g. by moving the piece into the slot it was dropped on.
   */
  onDrop: (zoneId: string | null) => void;
}

/**
 * Pick-up-and-drop for small fingers: lifts and grows while held (pattern from mobile/'s
 * useDragPan). The lift's zIndex only beats this piece's siblings — a Game must also give
 * the piece's container a raised zIndex (drag.liftZ) while it is held, or render it last.
 */
export function Draggable({ children, disabled = false, onPickUp, onDrop }: Props) {
  const { zoneAt, remeasure } = useDropZones();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);
  const handlers = useLatest({ onPickUp, onDrop });

  const pickUp = () => {
    remeasure();
    handlers.current.onPickUp?.();
  };
  const drop = (x: number, y: number) => handlers.current.onDrop(zoneAt(x, y));

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      lift.value = withTiming(1, { duration: drag.liftMs });
      runOnJS(pickUp)();
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(drop)(e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      tx.value = withSpring(0, drag.spring);
      ty.value = withSpring(0, drag.spring);
      lift.value = withTiming(0, { duration: drag.liftMs });
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: 1 + lift.value * drag.liftScale }],
    zIndex: lift.value > 0 ? drag.liftZ : drag.restZ,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
