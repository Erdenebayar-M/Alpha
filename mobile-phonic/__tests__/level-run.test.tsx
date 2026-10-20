import { act, render, renderHook } from '@testing-library/react-native';
import { GameRunner } from '../src/features/games/GameRunner';
import { buildGameContext } from '../src/features/games/context';
import { useLevelRun } from '../src/features/level/useLevelRun';
import { curriculum } from '../src/content';
import { useProgress } from '../src/store/progress';
import type { Game } from '../src/content/schema';

jest.mock('../src/audio/play', () => ({ playAudio: jest.fn(), playAsset: jest.fn() }));

const level = curriculum.worlds[0].levels[0];

beforeEach(() => {
  useProgress.setState({ profiles: [], activeProfileId: null, settings: { soundOn: false } });
  const p = useProgress.getState().addProfile('orto')!;
  useProgress.getState().selectProfile(p.id);
});

describe('useLevelRun', () => {
  it('records a Game once even if onFinish fires twice in one tick', async () => {
    const { result } = await renderHook(() => useLevelRun(level.id));
    const ok = { mistakes: 0, answers: [{ sound: 'a', correct: true }] };
    await act(async () => {
      result.current.finish(ok);
      result.current.finish(ok);
    });
    const profile = useProgress.getState().profiles[0];
    expect(profile.soundAccuracy.a).toEqual({ correct: 1, attempts: 1 });
    expect(Object.keys(profile.stars[level.id])).toEqual([level.games[0].id]);
    expect(result.current.game?.id).toBe(level.games[1].id);
  });

  it('is done after the last Game', async () => {
    const { result } = await renderHook(() => useLevelRun(level.id));
    for (let i = 0; i < level.games.length; i++) {
      await act(async () => result.current.finish({ mistakes: 0, answers: [] }));
    }
    expect(result.current.done).toBe(true);
    expect(useProgress.getState().profiles[0].stickers).toEqual([level.sticker]);
  });
});

describe('GameRunner', () => {
  it('skips an unregistered Game kind exactly once, even across re-renders', async () => {
    const onSkip = jest.fn();
    const game = { kind: 'not-a-kind', id: 'x' } as unknown as Game;
    const ctx = buildGameContext(curriculum, level, {}, 1);
    const { rerender } = await render(<GameRunner game={game} ctx={ctx} onFinish={jest.fn()} onSkip={onSkip} />);
    await rerender(<GameRunner game={game} ctx={ctx} onFinish={jest.fn()} onSkip={() => onSkip()} />);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
