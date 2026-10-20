import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { colors, trace } from '../../../theme/tokens';
import type { Stroke } from './strokes';

interface Props {
  stroke: Stroke;
  /** Board side in px. */
  size: number;
}

/** A pulsing dot where the stroke begins, with an arrow showing which way to go. */
export function StartMarker({ stroke, size }: Props) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(trace.pulseScale, { duration: trace.pulseMs }), -1, true));
  }, [pulse]);

  const m = size * trace.markerSize;
  const [x0, y0] = stroke[0];
  const [x1, y1] = stroke[1];
  const angle = Math.atan2(y1 - y0, x1 - x0);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle}rad` }, { scale: pulse.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x0 * size - m / 2, top: y0 * size - m / 2, width: m, height: m }, style]}
    >
      <Svg width={m} height={m}>
        <Circle cx={m / 2} cy={m / 2} r={m * trace.markerDot} fill={colors.sun} stroke={colors.ink} strokeWidth={m * trace.markerOutline} />
        <Polygon points={trace.markerArrow.map(([x, y]) => `${x * m},${y * m}`).join(' ')} fill={colors.ink} />
      </Svg>
    </Animated.View>
  );
}
