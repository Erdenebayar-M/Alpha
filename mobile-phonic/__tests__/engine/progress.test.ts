import { applyGameResult } from '../../src/engine/progress';
import type { Profile } from '../../src/store/progress';
import { tiny } from '../fixtures';

const fresh = (): Profile => ({ id: 'p', avatar: 'orto', createdAt: 0, stars: {}, soundAccuracy: {}, stickers: [] });
const l1 = tiny().worlds[0].levels[0];
const ok = { mistakes: 0, answers: [{ sound: 'a', correct: true }] };

describe('applyGameResult', () => {
  it('records Stars and Sound accuracy', () => {
    const p = applyGameResult(fresh(), l1, 'g1', { mistakes: 1, answers: [{ sound: 'a', correct: false }] });
    expect(p.stars.l1.g1).toBe(2);
    expect(p.soundAccuracy.a).toEqual({ correct: 0, attempts: 1 });
  });

  it('keeps the best Stars on replay', () => {
    let p = applyGameResult(fresh(), l1, 'g1', ok);
    p = applyGameResult(p, l1, 'g1', { mistakes: 5, answers: [] });
    expect(p.stars.l1.g1).toBe(3);
  });

  it('awards the Level\'s Sticker once, when it becomes Complete', () => {
    let p = fresh();
    p = applyGameResult(p, l1, 'g1', ok);
    p = applyGameResult(p, l1, 'g2', ok);
    expect(p.stickers).toEqual([]);
    p = applyGameResult(p, l1, 'g3', ok);
    expect(p.stickers).toEqual(['st_1']);
    p = applyGameResult(p, l1, 'g3', ok);
    expect(p.stickers).toEqual(['st_1']);
  });

  it('ignores a Game id that is not in the Level', () => {
    const p = applyGameResult(fresh(), l1, 'nope', ok);
    expect(p.stars).toEqual({});
  });
});
