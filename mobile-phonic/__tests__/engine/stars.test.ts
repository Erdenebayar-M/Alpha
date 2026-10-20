import { isLevelComplete, levelStars, starsForMistakes, unlockedLevelIds } from '../../src/engine/stars';
import { tiny } from '../fixtures';

describe('Stars', () => {
  it('maps mistakes to 3/2/1 — finishing always earns at least 1', () => {
    expect([0, 1, 2, 3, 9].map(starsForMistakes)).toEqual([3, 2, 2, 1, 1]);
  });

  const l1 = tiny().worlds[0].levels[0];

  it('a Level is Complete when every Game has at least 1 Star', () => {
    expect(isLevelComplete(l1, { g1: 3, g2: 1 })).toBe(false);
    expect(isLevelComplete(l1, { g1: 3, g2: 1, g3: 2 })).toBe(true);
    expect(isLevelComplete(l1, undefined)).toBe(false);
  });

  it('sums a Level\'s Stars from its own Games only', () => {
    expect(levelStars(l1, { g1: 3, g2: 1, other: 3 })).toBe(4);
  });

  it('unlocks the first Level, then each Level after a Complete one', () => {
    const c = tiny();
    expect([...unlockedLevelIds(c, {})]).toEqual(['l1']);
    expect([...unlockedLevelIds(c, { l1: { g1: 1, g2: 1, g3: 1 } })]).toEqual(['l1', 'l2']);
  });
});
