import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { curriculum } from '../../src/content';
import type { Curriculum, Game } from '../../src/content/schema';
import { buildGameContext } from '../../src/features/games/context';
import { BlendPickGame } from '../../src/features/games/blend-pick/BlendPickGame';
import {
  blendLayout,
  buildRound,
  buildRounds,
  freshSweep,
  pickDistractors,
  sweepStep,
  trackIndex,
} from '../../src/features/games/blend-pick/rounds';
import { playAsset, playAudio, playQueue } from '../../src/audio/play';
import { useGameArea } from '../../src/features/games/kit';
import { blend } from '../../src/theme/tokens';
import { tiny } from '../fixtures';

// Every clip settles at once, so the instruction counts as heard and picks advance immediately.
jest.mock('../../src/audio/play', () => {
  const settle = (_id: unknown, done?: (interrupted: boolean) => void) => done?.(false);
  return {
    playAudio: jest.fn(settle),
    playAsset: jest.fn(settle),
    playQueue: jest.fn((_ids: unknown, done?: (interrupted: boolean) => void) => done?.(false)),
    stopAudio: jest.fn(),
  };
});

type BlendGame = Extract<Game, { kind: 'blend-pick' }>;
const level = curriculum.worlds[0].levels.find((l) => l.games.some((g) => g.kind === 'blend-pick' && g.words.length === 3))!;
const game = level.games.find((g): g is BlendGame => g.kind === 'blend-pick')!;
const makeCtx = (seed = 1) => buildGameContext(curriculum, level, {}, seed);

describe('rounds', () => {
  it('builds up to 3 rounds, each with the target plus 2 distinct other Decodable words, shuffled', () => {
    const ctx = makeCtx();
    const rounds = buildRounds([...game.words, 'am'], ctx);
    expect(rounds).toHaveLength(3);
    const decodable = new Set(ctx.decodableWords.map((w) => w.id));
    for (const r of rounds) {
      expect(r.choices).toHaveLength(3);
      expect(new Set(r.choices.map((w) => w.id)).size).toBe(3);
      expect(r.choices.map((w) => w.id)).toContain(r.word.id);
      expect(r.choices.every((w) => decodable.has(w.id))).toBe(true);
      expect(r.sounds).toEqual(ctx.segmentWord(r.word));
    }
  });

  it('is reproducible for the same seed', () => {
    const ids = (seed: number) => buildRounds(game.words, makeCtx(seed)).map((r) => r.choices.map((w) => w.id));
    expect(ids(7)).toEqual(ids(7));
  });

  it('prefers distractors with a picture', () => {
    const base = tiny();
    const c: Curriculum = {
      ...base,
      words: [
        { id: 'am', text: 'ам', audio: 'w_am', image: 'img_am', approved: true },
        { id: 'ma', text: 'ма', audio: 'w_x', approved: true },
        { id: 'pic1', text: 'ама', audio: 'w_y', image: 'img_y', approved: true },
        { id: 'pic2', text: 'мама', audio: 'w_z', image: 'img_z', approved: true },
      ],
    };
    const lvl = c.worlds[0].levels[1];
    const ctx = buildGameContext(c, lvl, {}, 3);
    const picked = pickDistractors(c.words[0], ctx).map((w) => w.id);
    expect(picked.sort()).toEqual(['pic1', 'pic2']);
  });

  it('falls back to any curriculum word with a different first Sound when too few are Decodable', () => {
    const base = tiny();
    // At level 1 only "а" is taught, so nothing is Decodable.
    const ctx = buildGameContext(base, base.worlds[0].levels[0], {}, 1);
    expect(ctx.decodableWords).toHaveLength(0);
    const round = buildRound(base.words[0], ctx);
    // "ам" starts with а; "маа" starts with м, the only candidate.
    expect(round.choices.map((w) => w.id).sort()).toEqual(['am', 'maa']);
  });
});

describe('slide track', () => {
  it('maps x to the tile slice, clamped', () => {
    expect(trackIndex(-10, 300, 3)).toBe(0);
    expect(trackIndex(150, 300, 3)).toBe(1);
    expect(trackIndex(999, 300, 3)).toBe(2);
  });

  /** Feeds touches to the sweep; a `null` is a lift followed by a fresh touch. */
  const run = (xs: (number | null)[]) => {
    let s = freshSweep;
    const played: number[] = [];
    let complete = false;
    for (const x of xs) {
      if (x === null) {
        s = freshSweep;
        continue;
      }
      const r = sweepStep(s, x, 300, 3);
      s = r.next;
      played.push(...r.play);
      complete = r.complete;
    }
    return { played, complete };
  };

  it('plays a tile once on entry, not again while the finger stays in it', () => {
    expect(run([10, 20, 110, 120, 250])).toEqual({ played: [0, 1, 2], complete: false });
  });

  it('voices every tile a fast flick passed, in travel order', () => {
    expect(run([10, 299])).toEqual({ played: [0, 1, 2], complete: true });
    expect(run([290, 10]).played).toEqual([2, 1, 0]);
  });

  it('completes at the end of the track once every tile has been passed', () => {
    expect(run([10, 150, 250, 299]).complete).toBe(true);
  });

  it('forgets earlier touches: lifting and tapping the end does not blend the word', () => {
    expect(run([10, null, 299])).toEqual({ played: [0, 2], complete: false });
    expect(run([150, 299]).complete).toBe(false);
  });
});

describe('layout', () => {
  it('fits five tiles and three cards on a small landscape phone', () => {
    const { tileSize, cardSize } = blendLayout(400, 335, 5);
    expect(tileSize * 5 + blend.tileGap * 5).toBeLessThanOrEqual(400);
    expect(cardSize).toBeGreaterThan(0);
  });
});

describe('BlendPickGame', () => {
  beforeEach(() => {
    jest.mocked(playAsset).mockClear();
    jest.mocked(playQueue).mockClear();
  });

  const sweepTrack = async (xs: number[]) => {
    await act(async () => {
      fireGestureHandler(
        getByGestureTestId('blend-track'),
        xs.map((x) => ({ x })),
      );
    });
  };

  it('plays through every word and finishes once with the right answers', async () => {
    const ctx = makeCtx();
    const onFinish = jest.fn();
    const rounds = buildRounds(game.words, makeCtx());
    const widths: number[] = [];
    for (const r of rounds) widths.push(await trackWidthFor(r.sounds.length));
    await render(<BlendPickGame game={game} ctx={ctx} onFinish={onFinish} />);

    for (const [i, round] of rounds.entries()) {
      // Slide across: the middle of every slice, then the very end.
      expect(screen.queryByLabelText(`picture-${round.word.id}`)).toBeNull();
      const slice = widths[i] / round.sounds.length;
      await sweepTrack([...round.sounds.map((_, k) => slice * k + slice / 2), widths[i]]);
      const queued = jest.mocked(playQueue).mock.calls.flatMap((c) => c[0]);
      for (const s of round.sounds) expect(queued).toContain(ctx.soundById(s).audio);
      expect(queued).toContain(round.word.audio);

      const wrong = round.choices.find((w) => w.id !== round.word.id)!;
      await fireEvent.press(screen.getByLabelText(`picture-${wrong.id}`));
      await fireEvent.press(screen.getByLabelText(`picture-${round.word.id}`));
      expect(onFinish).toHaveBeenCalledTimes(i === rounds.length - 1 ? 1 : 0);
    }

    const result = onFinish.mock.calls[0][0];
    expect(result.mistakes).toBe(rounds.length);
    const expected = rounds.flatMap((r) => [{ sound: r.sounds[0], correct: false }, ...r.sounds.map((sound) => ({ sound, correct: true }))]);
    expect(result.answers).toEqual(expected);
  });

  it('does not offer pictures until the track has been slid to the end', async () => {
    const ctx = makeCtx();
    await render(<BlendPickGame game={game} ctx={ctx} onFinish={jest.fn()} />);
    await sweepTrack([1]);
    expect(screen.queryAllByLabelText(/^picture-/)).toHaveLength(0);
  });

  // The track is laid out from the Game area; renderHook must run before render (it replaces `screen`).
  const trackWidthFor = async (count: number) => {
    let area = { width: 0, height: 0 };
    await renderHook(() => {
      area = useGameArea();
    });
    const { tileSize } = blendLayout(area.width, area.height, count);
    return (tileSize + blend.tileGap) * count;
  };

  it('voices every tile of a fast flick and queues the word behind them', async () => {
    const ctx = makeCtx();
    const round = buildRounds(game.words, makeCtx())[0];
    const trackWidth = await trackWidthFor(round.sounds.length);
    await render(<BlendPickGame game={game} ctx={ctx} onFinish={jest.fn()} />);
    await sweepTrack([1, trackWidth]);
    const calls = jest.mocked(playQueue).mock.calls.map((c) => c[0]);
    expect(calls.at(-1)).toEqual([...round.sounds.slice(1).map((s) => ctx.soundById(s).audio), round.word.audio]);
    expect(screen.queryAllByLabelText(/^picture-/)).toHaveLength(3);
  });

  it('starts every touch afresh: tapping the first tile, lifting, then the end does not blend', async () => {
    const round = buildRounds(game.words, makeCtx())[0];
    const trackWidth = await trackWidthFor(round.sounds.length);
    await render(<BlendPickGame game={game} ctx={makeCtx()} onFinish={jest.fn()} />);
    await sweepTrack([1]);
    await sweepTrack([trackWidth]);
    expect(screen.queryAllByLabelText(/^picture-/)).toHaveLength(0);
  });

  it('ignores a full sweep during the instruction without using it up; a sweep after it still blends', async () => {
    const round = buildRounds(game.words, makeCtx())[0];
    const trackWidth = await trackWidthFor(round.sounds.length);
    const slice = trackWidth / round.sounds.length;
    const full = [...round.sounds.map((_, k) => slice * k + slice / 2), trackWidth];
    let instructionEnds: (() => void) | undefined;
    jest.mocked(playAudio).mockImplementationOnce((_id, done) => {
      instructionEnds = () => done?.(false);
    });
    await render(<BlendPickGame game={game} ctx={makeCtx()} onFinish={jest.fn()} />);
    await sweepTrack(full);
    expect(screen.queryAllByLabelText(/^picture-/)).toHaveLength(0);
    await act(async () => instructionEnds?.());
    await sweepTrack(full);
    expect(screen.queryAllByLabelText(/^picture-/)).toHaveLength(3);
  });
});
