import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { buildGameContext } from '../../src/features/games/context';
import { HearTapGame } from '../../src/features/games/hear-tap/HearTapGame';
import { buildRounds } from '../../src/features/games/hear-tap/rounds';
import { curriculum } from '../../src/content';
import { playAsset } from '../../src/audio/play';
import { hearTap } from '../../src/theme/tokens';

// The instruction settles at once unless a test holds it back via mockInstruction.
const mockInstruction: { hold: boolean; settle?: () => void } = { hold: false };
jest.mock('../../src/audio/play', () => ({
  playAudio: jest.fn((_id: string, done?: () => void) => {
    if (mockInstruction.hold) mockInstruction.settle = done;
    else done?.();
  }),
  playAsset: jest.fn(),
  stopAudio: jest.fn(),
}));

const levels = curriculum.worlds[0].levels;
const ctxFor = (levelIndex: number, weak: Record<string, { correct: number; attempts: number }> = {}) =>
  buildGameContext(curriculum, levels[levelIndex], weak, 7);

describe('buildRounds', () => {
  it('has 6 rounds: focus on 1, 2, 4, 6 and review on 3 and 5', () => {
    const ctx = ctxFor(4);
    const focus = levels[4].newSound;
    const rounds = buildRounds(focus, ctx);
    expect(rounds).toHaveLength(6);
    for (const i of [0, 1, 3, 5]) expect(rounds[i].target).toBe(focus);
    for (const i of [2, 4]) {
      expect(rounds[i].target).not.toBe(focus);
      expect(ctx.taught).toContain(rounds[i].target);
    }
    expect(rounds[2].target).not.toBe(rounds[4].target);
  });

  it('shows the target plus two different taught distractors', () => {
    const ctx = ctxFor(4);
    for (const r of buildRounds(levels[4].newSound, ctx)) {
      expect(r.options).toHaveLength(3);
      expect(new Set(r.options).size).toBe(3);
      expect(r.options).toContain(r.target);
      for (const o of r.options) expect(ctx.taught).toContain(o);
    }
  });

  it('uses the child’s weakest Sound for review', () => {
    const ctx = ctxFor(4, { m: { correct: 0, attempts: 5 } });
    expect(buildRounds(levels[4].newSound, ctx)[2].target).toBe('m');
  });

  it('on Level 1 repeats the focus for review and fills distractors from the path order', () => {
    const ctx = ctxFor(0);
    const rounds = buildRounds('a', ctx);
    expect(rounds.every((r) => r.target === 'a')).toBe(true);
    for (const r of rounds) expect(r.options.filter((o) => o !== 'a').sort()).toEqual(['m', 'o']);
  });

  it('is reproducible for the same seed', () => {
    expect(buildRounds('n', ctxFor(3))).toEqual(buildRounds('n', ctxFor(3)));
  });
});

describe('HearTapGame', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockInstruction.hold = false;
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  const setup = async () => {
    const ctx = ctxFor(3);
    const game = { kind: 'hear-tap', id: 'g', focus: levels[3].newSound } as const;
    const onFinish = jest.fn();
    await render(<HearTapGame game={game} ctx={ctx} onFinish={onFinish} />);
    return { rounds: buildRounds(game.focus, buildGameContext(curriculum, levels[3], {}, 7)), onFinish, game };
  };

  it('finishes once after a correct playthrough, with six correct answers', async () => {
    const { rounds, onFinish } = await setup();
    for (const r of rounds) {
      await fireEvent.press(screen.getByLabelText(`tile-${r.target}`));
      await act(async () => jest.advanceTimersByTime(hearTap.nextMs));
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
    const result = onFinish.mock.calls[0][0];
    expect(result.mistakes).toBe(0);
    expect(result.answers).toEqual(rounds.map((r) => ({ sound: r.target, correct: true })));
  });

  it('records a wrong tap as a mistake, ignores a repeat on the dimmed tile and lets the child retry', async () => {
    const { rounds, onFinish } = await setup();
    const wrong = rounds[0].options.find((o) => o !== rounds[0].target)!;
    await fireEvent.press(screen.getByLabelText(`tile-${wrong}`));
    await fireEvent.press(screen.getByLabelText(`tile-${wrong}`));
    for (const r of rounds) {
      await fireEvent.press(screen.getByLabelText(`tile-${r.target}`));
      await act(async () => jest.advanceTimersByTime(hearTap.nextMs));
    }
    const result = onFinish.mock.calls[0][0];
    expect(result.mistakes).toBe(1);
    expect(result.answers[0]).toEqual({ sound: rounds[0].target, correct: false });
    expect(result.answers).toHaveLength(7);
  });

  it('ignores taps until the instruction has been heard, then speaks the first Sound', async () => {
    mockInstruction.hold = true;
    const { rounds, onFinish } = await setup();
    const first = rounds[0];
    const wrong = first.options.find((o) => o !== first.target)!;
    await fireEvent.press(screen.getByLabelText(`tile-${wrong}`));
    await fireEvent.press(screen.getByLabelText(`tile-${first.target}`));
    expect(playAsset).not.toHaveBeenCalled();
    await act(async () => mockInstruction.settle?.());
    expect(playAsset).toHaveBeenCalledWith(curriculum.sounds.find((s) => s.id === first.target)!.audio);
    for (const r of rounds) {
      await fireEvent.press(screen.getByLabelText(`tile-${r.target}`));
      await act(async () => jest.advanceTimersByTime(hearTap.nextMs));
    }
    expect(onFinish.mock.calls[0][0].mistakes).toBe(0);
    expect(onFinish.mock.calls[0][0].answers).toHaveLength(6);
  });
});
