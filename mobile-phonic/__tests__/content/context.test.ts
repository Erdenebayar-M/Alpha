import { buildGameContext } from '../../src/features/games/context';
import { tiny } from '../fixtures';

describe('buildGameContext', () => {
  const c = tiny();
  const l2 = c.worlds[0].levels[1];

  it('gives renderers the taught Sounds, lookups and Decodable words', () => {
    const ctx = buildGameContext(c, l2, {}, 1);
    expect(ctx.taught.sort()).toEqual(['a', 'm']);
    expect(ctx.soundById('m').grapheme).toBe('м');
    expect(ctx.wordById('am').text).toBe('ам');
    expect(ctx.segmentWord(ctx.wordById('maa'))).toEqual(['m', 'aa']);
    // "маа" needs the untaught long vowel "аа".
    expect(ctx.decodableWords.map((w) => w.id)).toEqual(['am']);
  });

  it('includes the Profile\'s weak taught Sounds', () => {
    const ctx = buildGameContext(c, l2, { m: { correct: 0, attempts: 4 } }, 1);
    expect(ctx.weak).toEqual(['m']);
  });
});
