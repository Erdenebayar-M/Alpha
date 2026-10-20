import { act, render } from '@testing-library/react-native';
import { curriculum } from '../../src/content';
import { buildGameContext } from '../../src/features/games/context';
import { SortGame } from '../../src/features/games/sort/SortGame';
import { basketId, buildRounds, dropOutcome } from '../../src/features/games/sort/rounds';
import { sortLayout } from '../../src/features/games/sort/layout';
import { bubble, sortGame, space, tile } from '../../src/theme/tokens';
import { encourageRetry } from '../../src/features/games/kit';
import { playAsset } from '../../src/audio/play';

jest.mock('../../src/audio/play', () => ({ playAudio: jest.fn((_id: string, done?: () => void) => done?.()), playAsset: jest.fn(), stopAudio: jest.fn() }));
jest.mock('../../src/features/games/kit/feedback', () => ({ encourageRetry: jest.fn() }));

// The real Draggable needs native gestures; this one hands its latest props to the test.
const mockDrag: { onDrop: (zone: string | null) => void; onPickUp?: () => void } = { onDrop: () => {} };
jest.mock('../../src/features/games/kit/Draggable', () => ({
  Draggable: ({ children, onDrop, onPickUp }: { children: React.ReactNode; onDrop: (z: string | null) => void; onPickUp?: () => void }) => {
    mockDrag.onDrop = onDrop;
    mockDrag.onPickUp = onPickUp;
    return children;
  },
}));

const levels = curriculum.worlds[0].levels;
const level = levels.find((l) => l.games.some((g) => g.kind === 'sort'))!;
const game = level.games.find((g) => g.kind === 'sort')!;
if (game.kind !== 'sort') throw new Error('expected a sort Game');
const ctxFor = () => buildGameContext(curriculum, level, {}, 11);
const otherSound = (target: string) => game.sounds.find((s) => s !== target)!;

describe('buildRounds', () => {
  const ctx = ctxFor();
  const words = game.words.map(ctx.wordById);

  it('makes one round per word, aimed at the basket of its first Sound', () => {
    const rounds = buildRounds(words, game.sounds, ctx.segmentWord, ctx.rng);
    expect(rounds.map((r) => r.word.id).sort()).toEqual([...game.words].sort());
    for (const r of rounds) expect(r.target).toBe(ctx.segmentWord(r.word)[0]);
  });

  it('is reproducible for the same seed and shuffles', () => {
    const a = buildRounds(words, game.sounds, ctx.segmentWord, ctxFor().rng);
    const b = buildRounds(words, game.sounds, ctx.segmentWord, ctxFor().rng);
    expect(a).toEqual(b);
  });

  it('skips a word that starts with neither basket Sound', () => {
    const rounds = buildRounds(words, [game.sounds[0], 'zzz'], ctx.segmentWord, ctx.rng);
    expect(rounds.every((r) => r.target === game.sounds[0])).toBe(true);
  });
});

describe('sortLayout', () => {
  // Same arithmetic as useGameArea, for a given window.
  const areaOf = (w: number, h: number) => ({ width: w - 2 * space.xl - 2 * (bubble + space.lg), height: h - 2 * space.xl });

  it.each([
    ['iPhone landscape', 844, 390],
    ['iPad 13"', 1376, 1032],
  ])('fits three pieces and two gaps in the game area on %s', (_name, w, h) => {
    const area = areaOf(w, h);
    const l = sortLayout(area);
    expect(3 * l.edge + 2 * l.gap).toBeLessThanOrEqual(area.width + 0.001);
    expect(l.edge).toBeLessThanOrEqual(tile.pictureSize);
    expect(l.tile).toBeLessThanOrEqual(tile.size);
  });
});

describe('dropOutcome', () => {
  const round = { word: ctxFor().wordById(game.words[0]), target: 'a' };
  it('is correct on the right basket, wrong on the other, ignored off any basket', () => {
    expect(dropOutcome(round, basketId('a'))).toBe('correct');
    expect(dropOutcome(round, basketId('n'))).toBe('wrong');
    expect(dropOutcome(round, null)).toBe('ignored');
  });
});

describe('SortGame', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  const firstSoundOfCard = (ctx: ReturnType<typeof ctxFor>, order: string[], i: number) => ctx.segmentWord(ctx.wordById(order[i]))[0];

  it('sorts every word, retries a wrong basket, and finishes once with the right answers', async () => {
    const ctx = ctxFor();
    const onFinish = jest.fn();
    await render(<SortGame game={game} ctx={ctx} onFinish={onFinish} />);

    // Rounds come out in the seeded shuffle order.
    const order = buildRounds(game.words.map(ctx.wordById), game.sounds, ctx.segmentWord, ctxFor().rng).map((r) => r.word.id);

    // A drop on empty space does nothing.
    await act(async () => mockDrag.onDrop(null));
    expect(encourageRetry).not.toHaveBeenCalled();

    // Wrong basket first: recorded as a mistake, card stays, child is encouraged.
    const first = firstSoundOfCard(ctx, order, 0);
    await act(async () => mockDrag.onDrop(basketId(otherSound(first))));
    expect(encourageRetry).toHaveBeenCalledTimes(1);

    for (let i = 0; i < order.length; i++) {
      await act(async () => mockDrag.onDrop(basketId(firstSoundOfCard(ctx, order, i))));
    }
    expect(onFinish).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(sortGame.finishMs + 1));
    await act(async () => jest.advanceTimersByTime(sortGame.finishMs * 5));

    expect(onFinish).toHaveBeenCalledTimes(1);
    const result = onFinish.mock.calls[0][0];
    expect(result.mistakes).toBe(1);
    expect(result.answers).toHaveLength(order.length + 1);
    expect(result.answers[0]).toEqual({ sound: first, correct: false });
    expect(result.answers.filter((a: { correct: boolean }) => a.correct)).toHaveLength(order.length);
  });

  it('says the first word once the instruction ends, and again when the card is picked up', async () => {
    const ctx = ctxFor();
    await render(<SortGame game={game} ctx={ctx} onFinish={jest.fn()} />);
    expect(playAsset).toHaveBeenCalledTimes(1);
    await act(async () => mockDrag.onPickUp?.());
    expect(playAsset).toHaveBeenCalledTimes(2);
    expect((playAsset as jest.Mock).mock.calls[1][0]).toMatch(/^w_/);
  });
});
