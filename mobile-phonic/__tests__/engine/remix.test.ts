import { pickReviewSounds } from '../../src/engine/remix';
import { mulberry32 } from '../../src/engine/rng';

const taught = ['a', 'm', 'o', 'n', 'u', 'l'];

describe('Weak-sound remix', () => {
  it('fills up to half the slots with weak Sounds, the rest from taught', () => {
    const r = pickReviewSounds({ taught, weak: ['n', 'l', 'u'], exclude: [], count: 4, rng: mulberry32(1) });
    expect(r).toHaveLength(4);
    expect(r.slice(0, 2)).toEqual(['n', 'l']);
    expect(new Set(r).size).toBe(4);
    r.forEach((s) => expect(taught).toContain(s));
  });

  it('never returns excluded or untaught Sounds', () => {
    const r = pickReviewSounds({ taught, weak: ['x', 'a'], exclude: ['a', 'm'], count: 10, rng: mulberry32(2) });
    expect(r).not.toContain('a');
    expect(r).not.toContain('m');
    expect(r).not.toContain('x');
    expect(r).toHaveLength(4);
  });

  it('is deterministic for a seed', () => {
    const run = () => pickReviewSounds({ taught, weak: [], exclude: [], count: 3, rng: mulberry32(7) });
    expect(run()).toEqual(run());
  });
});
