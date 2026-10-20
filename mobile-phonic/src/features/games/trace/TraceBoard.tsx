import { useMemo, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, shadow, trace } from '../../../theme/tokens';
import { useInstructed, useLatest, usePop, useShake } from '../kit';
import { StartMarker } from './StartMarker';
import type { Point, Stroke } from './strokes';
import { createTracer, toPath, type Tracer } from './tracing';

interface Props {
  strokes: readonly Stroke[];
  /** Board side in px. */
  size: number;
  /** The finger strayed and the stroke was reset (already shaken). */
  onStray: () => void;
  /** Every stroke was traced. */
  onComplete: () => void;
}

interface Handlers {
  onTrail: Dispatch<SetStateAction<Point[]>>;
  onStroke: (index: number) => void;
  shake: () => void;
  onStray: () => void;
  onComplete: () => void;
}

/** Feeds the finger to the tracer and reports what happened. Lives outside the component so the gesture is stable. */
function panGesture(tracer: Tracer, strokes: readonly Stroke[], size: number, handlers: RefObject<Handlers>) {
  const move = (x: number, y: number) => {
    const h = handlers.current;
    const p: Point = [x / size, y / size];
    const start = strokes[tracer.stroke]?.[0];
    const event = tracer.move(p);
    if (event === 'progress') h.onTrail((t) => (t.length ? [...t, p] : [start, p]));
    else if (event === 'stray') {
      h.onTrail([]);
      h.shake();
      h.onStray();
    } else if (event === 'stroke' || event === 'letter') {
      h.onTrail([]);
      h.onStroke(tracer.stroke);
      if (event === 'letter') h.onComplete();
    }
  };
  return Gesture.Pan()
    .withTestId('trace-pad')
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      tracer.begin();
      move(e.x, e.y);
    })
    .onUpdate((e) => move(e.x, e.y))
    // Lifting early just starts the stroke over — not a mistake.
    .onFinalize(() => {
      tracer.end();
      handlers.current.onTrail([]);
    });
}

const lineProps = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** One tracing of a letter: faint guide, ink that follows the finger, strokes checked in order. */
export function TraceBoard({ strokes, size, onStray, onComplete }: Props) {
  const instructed = useInstructed();
  const { style: shakeStyle, shake } = useShake();
  const [strokeIdx, setStrokeIdx] = useState(0);
  const [trail, setTrail] = useState<Point[]>([]);
  const { style: popStyle, pop } = usePop();

  const [tracer] = useState(() => createTracer(strokes));

  const finished = strokeIdx >= strokes.length;

  const latest = useLatest<Handlers>({
    onTrail: setTrail,
    onStroke: setStrokeIdx,
    shake,
    onStray,
    onComplete: () => {
      pop();
      onComplete();
    },
  });
  const gesture = useMemo(() => panGesture(tracer, strokes, size, latest).enabled(instructed), [tracer, strokes, size, latest, instructed]);

  const guideWidth = size * trace.guideWidth;
  const inkWidth = size * trace.inkWidth;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.board, { width: size, height: size }, shakeStyle, popStyle]}>
        <Svg width={size} height={size}>
          {strokes.map((s, i) => (
            <Path key={`guide-${i}`} d={toPath(s, size)} stroke={colors.ink} strokeOpacity={trace.guideOpacity} strokeWidth={guideWidth} {...lineProps} />
          ))}
          {strokes.slice(0, strokeIdx).map((s, i) => (
            <Path key={`ink-${i}`} d={toPath(s, size)} stroke={colors.skyDeep} strokeWidth={inkWidth} {...lineProps} />
          ))}
          {trail.length > 1 && <Path d={toPath(trail, size)} stroke={colors.skyDeep} strokeWidth={inkWidth} {...lineProps} />}
        </Svg>
        {!finished && trail.length === 0 && <StartMarker key={strokeIdx} stroke={strokes[strokeIdx]} size={size} />}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: colors.white, borderRadius: radii.lg, ...shadow },
});
