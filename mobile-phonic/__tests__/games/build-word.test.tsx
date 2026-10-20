import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { curriculum } from '../../src/content';
import type { Game } from '../../src/content/schema';
import { playAsset, playQueue } from '../../src/audio/play';
import { buildGameContext } from '../../src/features/games/context';
import { BuildWordGame } from '../../src/features/games/build-word/BuildWordGame';
import { buildRounds, judgeDrop, slotId, slotIndex, splitRows, type Round } from '../../src/features/games/build-word/rounds';

// Clips "finish" at once, so the instruction -> word -> read-back chain runs synchronously.
jest.mock('../../src/audio/play', () => ({
  playAudio: jest.fn((_id: string, onSettled?: (interrupted: boolean) => void) => onSettled?.(false)),
  playAsset: jest.fn((_id: string, onSettled?: (interrupted: boolean) => void) => onSettled?.(false)),
  playQueue: jest.fn((_ids: string[], onSettled?: (interrupted: boolean) => void) => onSettled?.(false)),
  stopAudio: jest.fn(),
}));

// A real drag can't run under Jest: a tile's "drop" is a press that lands on `mockDropTarget`.
let mockDropTarget: string | null = null;
jest.mock('../../src/features/games/kit/Draggable', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    Draggable: ({ children, onDrop, disabled }: { children: React.ReactNode; onDrop: (z: string | null) => void; disabled?: boolean }) => (
      <Pressable testID="tile" disabled={disabled} onPress={() => onDrop(mockDropTarget)}>
        {children}
      </Pressable>
    ),
  };
});

const isBuild = (g: Game): g is Extract<Game, { kind: 'build-word' }> => g.kind === 'build-word';
// A Level whose build-word Game has several words, so "move on to the next word" is testable.
const level = curriculum.worlds[0].levels.find((l) => l.games.some((g) => isBuild(g) && g.words.length > 1))!;
const game = level.games.find(isBuild)!;
const ctx = () => buildGameContext(curriculum, level, {}, 7);

const round: Round = {
  wordId: 'x',
  sounds: ['m', 'a', 'm'],
  tiles: [
    { key: 'k0', sound: 'a' },
    { key: 'k1', sound: 'm' },
    { key: 'k2', sound: 'm' },
    { key: 'k3', sound: 'n' },
  ],
};

describe('rounds', () => {
  it('builds one round per word with its tiles plus up to 2 untaught-free distractors', () => {
    const c = ctx();
    const rounds = buildRounds(game, c);
    expect(rounds).toHaveLength(Math.min(game.words.length, 4));
    rounds.forEach((r, i) => {
      const sounds = c.segmentWord(c.wordById(game.words[i]));
      expect(r.sounds).toEqual(sounds);
      const extra = r.tiles.filter((t) => !sounds.includes(t.sound));
      expect(extra.length).toBeLessThanOrEqual(2);
      expect(r.tiles).toHaveLength(sounds.length + extra.length);
      expect(new Set(r.tiles.map((t) => t.key)).size).toBe(r.tiles.length);
      extra.forEach((t) => expect(c.taught).toContain(t.sound));
      [...sounds].sort().forEach((s) => expect(r.tiles.map((t) => t.sound)).toContain(s));
    });
  });

  it('caps a game at 4 words', () => {
    const c = ctx();
    const many = { ...game, words: Array(6).fill(game.words[0]) };
    expect(buildRounds(many, c)).toHaveLength(4);
  });

  it('is reproducible for the same seed', () => {
    expect(buildRounds(game, ctx())).toEqual(buildRounds(game, ctx()));
  });
});

describe('slot ids', () => {
  it('round-trips and rejects foreign zones', () => {
    expect(slotIndex(slotId(2))).toBe(2);
    expect(slotIndex('basket-1')).toBeNull();
    expect(slotIndex(null)).toBeNull();
  });
});

describe('splitRows', () => {
  it('keeps order and fills the first row first', () => {
    expect(splitRows([1, 2, 3, 4, 5], 1)).toEqual([[1, 2, 3, 4, 5]]);
    expect(splitRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2, 3], [4, 5]]);
    expect(splitRows([1], 2)).toEqual([[1]]);
  });
});

describe('judgeDrop', () => {
  const empty = [null, null, null];
  it('accepts the right Sound, rejects the wrong one', () => {
    expect(judgeDrop(round, empty, 'k1', 0)).toBe('right');
    expect(judgeDrop(round, empty, 'k0', 0)).toBe('wrong');
    expect(judgeDrop(round, empty, 'k3', 1)).toBe('wrong');
  });
  it('treats two tiles of the same Sound as interchangeable', () => {
    expect(judgeDrop(round, empty, 'k2', 2)).toBe('right');
  });
  it('ignores drops off the slots, on filled slots, and of used tiles', () => {
    expect(judgeDrop(round, empty, 'k1', null)).toBe('ignore');
    expect(judgeDrop(round, ['k1', null, null], 'k2', 0)).toBe('ignore');
    expect(judgeDrop(round, ['k1', null, null], 'k1', 2)).toBe('ignore');
    expect(judgeDrop(round, empty, 'nope', 0)).toBe('ignore');
  });
});

/** Drops every tile of a round onto its slot; returns the answers that should have been recorded. */
async function playRound(r: Round, mistakeFirst: boolean) {
  const expected: { sound: string; correct: boolean }[] = [];
  const tray = [...r.tiles];
  for (const [slot, sound] of r.sounds.entries()) {
    mockDropTarget = slotId(slot);
    if (mistakeFirst && slot === 0) {
      await fireEvent.press(screen.getAllByTestId('tile')[tray.findIndex((t) => t.sound !== sound)]);
      expected.push({ sound, correct: false });
    }
    const at = tray.findIndex((t) => t.sound === sound);
    await fireEvent.press(screen.getAllByTestId('tile')[at]);
    tray.splice(at, 1);
    expected.push({ sound, correct: true });
  }
  return expected;
}

describe('BuildWordGame', () => {
  beforeEach(() => {
    jest.mocked(playAsset).mockClear();
    jest.mocked(playQueue).mockClear();
  });

  it('plays a wrong drop as a mistake, then finishes once after a correct playthrough', async () => {
    const c = ctx();
    const onFinish = jest.fn();
    await render(<BuildWordGame game={game} ctx={c} onFinish={onFinish} />);
    const words = buildRounds(game, ctx());

    // The first word is spoken once the instruction has finished.
    expect(playAsset).toHaveBeenCalledWith(c.wordById(words[0].wordId).audio);

    const expected: { sound: string; correct: boolean }[] = [];
    for (const [w, r] of words.entries()) {
      expected.push(...(await playRound(r, w === 0)));
      expect(playQueue).toHaveBeenLastCalledWith(
        [...r.sounds.map((x) => c.soundById(x).audio), c.wordById(r.wordId).audio],
        expect.any(Function),
      );
    }

    expect(onFinish).toHaveBeenCalledTimes(1);
    const result = onFinish.mock.calls[0][0];
    expect(result.answers).toEqual(expected);
    expect(result.mistakes).toBe(1);
    // Nothing more happens afterwards.
    await act(async () => {});
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('still moves to the next word when the read-back is interrupted', async () => {
    const c = ctx();
    const onFinish = jest.fn();
    await render(<BuildWordGame game={game} ctx={c} onFinish={onFinish} />);
    const words = buildRounds(game, ctx());
    expect(words.length).toBeGreaterThan(1);

    // The child taps Listen or Orto mid read-back: the queue settles as interrupted.
    jest.mocked(playQueue).mockImplementationOnce((_ids, onSettled) => onSettled?.(true));
    await playRound(words[0], false);

    expect(playAsset).toHaveBeenLastCalledWith(c.wordById(words[1].wordId).audio);
    expect(screen.getAllByTestId('tile')).toHaveLength(words[1].tiles.length);
    expect(screen.getAllByTestId('tile')[0].props.accessibilityState?.disabled).toBeFalsy();
    expect(onFinish).not.toHaveBeenCalled();

    // Interrupt the last word too: the Game still ends, once.
    for (const r of words.slice(1)) {
      jest.mocked(playQueue).mockImplementationOnce((_ids, onSettled) => onSettled?.(true));
      await playRound(r, false);
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('judges two near-simultaneous drops against the board, not a stale render', async () => {
    const onFinish = jest.fn();
    const one = { ...game, words: [game.words[0]] };
    await render(<BuildWordGame game={one} ctx={ctx()} onFinish={onFinish} />);
    const r = buildRounds(one, ctx())[0];
    const right = r.tiles.findIndex((t) => t.sound === r.sounds[0]);
    const other = r.tiles.findIndex((t, i) => i !== right);
    mockDropTarget = slotId(0);
    const tiles = screen.getAllByTestId('tile');
    // Both land on slot 0 before React re-renders: the second finds it taken and is ignored.
    await Promise.all([fireEvent.press(tiles[right]), fireEvent.press(tiles[other])]);

    const tray = r.tiles.filter((_, i) => i !== right);
    for (const [slot, sound] of r.sounds.entries()) {
      if (slot === 0) continue;
      mockDropTarget = slotId(slot);
      const at = tray.findIndex((t) => t.sound === sound);
      await fireEvent.press(screen.getAllByTestId('tile')[at]);
      tray.splice(at, 1);
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
    const result = onFinish.mock.calls[0][0];
    expect(result.mistakes).toBe(0);
    expect(result.answers).toHaveLength(r.sounds.length);
  });
});
