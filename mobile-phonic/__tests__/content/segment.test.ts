import { segment } from '../../src/content/segment';
import { tiny } from '../fixtures';

const sounds = tiny().sounds;

describe('segment', () => {
  it('splits a word into Sound ids', () => {
    expect(segment('ам', sounds)).toEqual(['a', 'm']);
  });

  it('prefers the longest Grapheme (long vowels are one Sound)', () => {
    expect(segment('маа', sounds)).toEqual(['m', 'aa']);
  });

  it('ignores case', () => {
    expect(segment('АМ', sounds)).toEqual(['a', 'm']);
  });

  it('returns null when a letter is not a known Sound', () => {
    expect(segment('ах', sounds)).toBeNull();
  });
});
