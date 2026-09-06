import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

/**
 * The pan-to-drag rig shared by `DraggableSyllable`, `DraggableMark`, and
 * `DraggableImageCard`: the tile follows the finger (lifting + growing so it reads as
 * picked up), reports its screen position on move, and always springs back to its
 * origin on release — the caller decides, from the drop coordinates, whether that
 * counts as a placement. Only the lift's scale/shadow numbers (and, for `DraggableMark`,
 * a fade so the drop target stays visible underneath) differ between the three.
 *
 * A caller that needs to forward an id through `onDragStart`/`onDrop` (as
 * `DraggableImageCard` does with `leftId`) closes over it at the call site — this hook's
 * own callback signatures stay fixed.
 */
export function useDragPan({
  enabled = true,
  scaleBoost,
  shadowOpacity,
  shadowRadius,
  fade = 0,
  onDragStart,
  onDragMove,
  onDrop,
}: {
  enabled?: boolean;
  /** Extra scale at full lift (final scale = 1 + scaleBoost). */
  scaleBoost: number;
  /** [resting, extra at full lift] — final shadowOpacity = resting + lift * extra. */
  shadowOpacity: [number, number];
  /** [resting, extra at full lift] — final shadowRadius = resting + lift * extra. */
  shadowRadius: [number, number];
  /** Opacity reduction at full lift (final opacity = 1 - lift * fade). 0 = no fade. */
  fade?: number;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDrop: (x: number, y: number) => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0); // 0 = resting, 1 = picked up

  const pan = Gesture.Pan()
    .enabled(enabled)
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
      tx.value = withSpring(0, { damping: 18, stiffness: 220 });
      ty.value = withSpring(0, { damping: 18, stiffness: 220 });
      lift.value = withTiming(0, { duration: 160 });
    });

  const [restingOpacity, extraOpacity] = shadowOpacity;
  const [restingRadius, extraRadius] = shadowRadius;

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: 1 + lift.value * scaleBoost },
    ],
    zIndex: lift.value > 0 ? 50 : 1,
    opacity: 1 - lift.value * fade,
    shadowOpacity: restingOpacity + lift.value * extraOpacity,
    shadowRadius: restingRadius + lift.value * extraRadius,
  }));

  return { pan, style };
}
