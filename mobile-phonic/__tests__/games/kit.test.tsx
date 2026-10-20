import { renderHook } from '@testing-library/react-native';
import { hitTest } from '../../src/features/games/kit/hitTest';
import { useAnswers } from '../../src/features/games/kit/useAnswers';

describe('hitTest', () => {
  const zones = new Map([
    ['slot-0', { x: 0, y: 0, width: 100, height: 100 }],
    ['slot-1', { x: 120, y: 0, width: 100, height: 100 }],
  ]);
  it('finds the zone under a point, edges included', () => {
    expect(hitTest(zones, 50, 50)).toBe('slot-0');
    expect(hitTest(zones, 120, 100)).toBe('slot-1');
  });
  it('returns null between zones', () => {
    expect(hitTest(zones, 110, 50)).toBeNull();
  });
});

describe('useAnswers', () => {
  it('finishes once with every answer, wrong ones counted as mistakes', async () => {
    const onFinish = jest.fn();
    const { result } = await renderHook(() => useAnswers(onFinish));
    result.current.record('a', false);
    result.current.record('a', true);
    result.current.record('m', true);
    result.current.finish();
    result.current.finish();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({
      mistakes: 1,
      answers: [
        { sound: 'a', correct: false },
        { sound: 'a', correct: true },
        { sound: 'm', correct: true },
      ],
    });
  });

  it('never finishes after the Game has unmounted', async () => {
    const onFinish = jest.fn();
    const { result, unmount } = await renderHook(() => useAnswers(onFinish));
    const { finish } = result.current;
    await unmount();
    finish();
    expect(onFinish).not.toHaveBeenCalled();
  });
});
