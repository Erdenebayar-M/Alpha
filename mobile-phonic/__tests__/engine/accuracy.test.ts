import { tallyAnswers, weakSounds } from '../../src/engine/accuracy';

describe('Sound accuracy', () => {
  it('tallies answers per Sound without mutating', () => {
    const before = { a: { correct: 1, attempts: 1 } };
    const after = tallyAnswers(before, [
      { sound: 'a', correct: false },
      { sound: 'm', correct: true },
    ]);
    expect(after).toEqual({ a: { correct: 1, attempts: 2 }, m: { correct: 1, attempts: 1 } });
    expect(before.a.attempts).toBe(1);
  });

  it('weak Sounds: taught, enough attempts, below 80%, worst first', () => {
    const acc = {
      a: { correct: 1, attempts: 4 }, // 25%
      m: { correct: 3, attempts: 4 }, // 75%
      o: { correct: 4, attempts: 4 }, // strong
      n: { correct: 0, attempts: 2 }, // too few attempts
      u: { correct: 0, attempts: 5 }, // not taught
    };
    expect(weakSounds(acc, new Set(['a', 'm', 'o', 'n']))).toEqual(['a', 'm']);
    expect(weakSounds(acc, new Set(['a', 'm']), { max: 1 })).toEqual(['a']);
  });
});
