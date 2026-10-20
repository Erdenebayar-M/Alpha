import { act, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { playAsset } from '../../src/audio/play';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { curriculum } from '../../src/content';
import { buildGameContext } from '../../src/features/games/context';
import { STROKES, type Stroke } from '../../src/features/games/trace/strokes';
import { TraceGame } from '../../src/features/games/trace/TraceGame';
import { boardSize, distanceToPath, stepStroke, toPath } from '../../src/features/games/trace/tracing';
import { bubble, space, trace } from '../../src/theme/tokens';

jest.mock('../../src/audio/play', () => ({ playAudio: jest.fn((_id: string, settled?: (interrupted: boolean) => void) => settled?.(false)), stopAudio: jest.fn(), playAsset: jest.fn((_id: string, settled?: (interrupted: boolean) => void) => settled?.(false)) }));

const world1 = curriculum.worlds[0];
const level = world1.levels[0];
const ctx = buildGameContext(curriculum, level, {}, 1);
const sizePx = (() => {
  const { width, height } = Dimensions.get('window');
  const inset = bubble + space.lg;
  return boardSize({ width: width - 2 * space.xl - 2 * inset, height: height - 2 * space.xl });
})();

describe('strokes', () => {
  const ids = world1.levels.map((l) => l.newSound);

  it('has strokes for every World 1 Sound', () => {
    expect(ids).toHaveLength(11);
    for (const id of ids) expect(STROKES[id]?.length).toBeGreaterThan(0);
  });

  it('keeps every checkpoint in the 0–1 box, ordered closely enough to follow', () => {
    for (const id of ids) {
      for (const stroke of STROKES[id]) {
        expect(stroke.length).toBeGreaterThanOrEqual(2);
        stroke.forEach(([x, y], i) => {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(1);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(1);
          if (i > 0) expect(Math.hypot(x - stroke[i - 1][0], y - stroke[i - 1][1])).toBeLessThanOrEqual(trace.tolerance * 3);
        });
      }
    }
  });
});

describe('toPath', () => {
  const nums = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

  it('leaves no cusp where a closed stroke (о, ө) starts and ends', () => {
    const v = nums(toPath(STROKES.o[0], 1));
    // M x y, then C c1 c2 end per segment: the outgoing and incoming tangents at the join must match.
    const [mx, my] = v;
    const [c1x, c1y] = v.slice(2, 4);
    const last = v.slice(-6);
    expect([c1x - mx, c1y - my]).toEqual([last[4] - last[2], last[5] - last[3]].map((x) => expect.closeTo(x, 9)));
  });

  it('keeps an open stroke starting straight at its first checkpoint', () => {
    expect(toPath(STROKES.m[0], 1).startsWith(`M${STROKES.m[0][0][0]} ${STROKES.m[0][0][1]}`)).toBe(true);
  });
});

describe('stepStroke', () => {
  const line: Stroke = [[0.1, 0.5], [0.3, 0.5], [0.5, 0.5], [0.7, 0.5]];

  it('advances through checkpoints reached within tolerance and finishes at the last', () => {
    let r = stepStroke(line, 0, [0.1, 0.5]);
    expect(r).toEqual({ next: 1, status: 'tracing' });
    r = stepStroke(line, r.next, [0.3, 0.55]);
    expect(r.next).toBe(2);
    r = stepStroke(line, r.next, [0.5, 0.5]);
    r = stepStroke(line, r.next, [0.7, 0.5]);
    expect(r).toEqual({ next: 4, status: 'done' });
  });

  it('does not penalise a finger that has not started', () => {
    expect(stepStroke(line, 0, [0.9, 0.9])).toEqual({ next: 0, status: 'tracing' });
  });

  it('allows a small wobble but resets beyond 2× tolerance', () => {
    expect(stepStroke(line, 2, [0.4, 0.5 + trace.tolerance * 1.5]).status).toBe('tracing');
    expect(stepStroke(line, 2, [0.4, 0.5 + trace.tolerance * 2.2])).toEqual({ next: 0, status: 'stray' });
  });

  it('measures distance to the polyline, not just the checkpoints', () => {
    expect(distanceToPath(line, [0.4, 0.5])).toBeCloseTo(0);
    expect(distanceToPath(line, [0.4, 0.6])).toBeCloseTo(0.1);
  });
});

/** Drags the finger through a stroke's checkpoints (px on the board). */
const dragPoints = (points: readonly (readonly [number, number])[]) => [
  { state: State.BEGAN, x: points[0][0] * sizePx, y: points[0][1] * sizePx },
  ...points.map(([x, y]) => ({ state: State.ACTIVE, x: x * sizePx, y: y * sizePx })),
  { state: State.END, x: points[points.length - 1][0] * sizePx, y: points[points.length - 1][1] * sizePx },
];
const drag = (points: readonly (readonly [number, number])[]) => fireGestureHandler(getByGestureTestId('trace-pad'), dragPoints(points));

async function setup() {
  const onFinish = jest.fn();
  await render(<TraceGame game={{ kind: 'trace', id: 'trace', sound: 'a' }} ctx={ctx} onFinish={onFinish} />);
  return onFinish;
}

describe('TraceGame', () => {
  it('finishes once after three correct tracings, recording each', async () => {
    const onFinish = await setup();
    for (let rep = 0; rep < trace.reps; rep++) {
      for (const stroke of STROKES.a) await act(async () => drag(stroke));
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({
      mistakes: 0,
      answers: Array.from({ length: trace.reps }, () => ({ sound: 'a', correct: true })),
    });
  });

  it('records a stray as one mistake and lets the child try the stroke again', async () => {
    const onFinish = await setup();
    const [first] = STROKES.a;
    // Start properly, then wander far off the path, and keep wandering: still one mistake.
    await act(async () => drag([first[0], first[1], [0.5, 0.5], [0.45, 0.5], [0.4, 0.55]]));
    for (let rep = 0; rep < trace.reps; rep++) {
      for (const stroke of STROKES.a) await act(async () => drag(stroke));
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
    const result = onFinish.mock.calls[0][0];
    expect(result.mistakes).toBe(1);
    expect(result.answers[0]).toEqual({ sound: 'a', correct: false });
    expect(result.answers.filter((a: { correct: boolean }) => a.correct)).toHaveLength(trace.reps);
  });

  it('treats lifting the finger early as a fresh start, not a mistake', async () => {
    const onFinish = await setup();
    const [first] = STROKES.a;
    await act(async () => drag(first.slice(0, 3)));
    for (let rep = 0; rep < trace.reps; rep++) {
      for (const stroke of STROKES.a) await act(async () => drag(stroke));
    }
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ mistakes: 0 }));
  });

  it('still advances when the Sound is interrupted (Listen or Orto tapped)', async () => {
    (playAsset as jest.Mock).mockImplementation((_id: string, settled?: (interrupted: boolean) => void) => settled?.(true));
    const onFinish = await setup();
    for (let rep = 0; rep < trace.reps; rep++) {
      for (const stroke of STROKES.a) await act(async () => drag(stroke));
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
