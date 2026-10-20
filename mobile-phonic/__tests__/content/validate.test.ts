import { validateCurriculum } from '../../src/content/validate';
import { knownAssets, tiny } from '../fixtures';

const dev = { release: false, ...knownAssets };
const errorsOf = (c: unknown, opts = dev) => {
  const r = validateCurriculum(c, opts);
  return r.ok ? [] : r.errors;
};

describe('validateCurriculum', () => {
  it('accepts a valid curriculum', () => {
    expect(validateCurriculum(tiny(), dev).ok).toBe(true);
  });

  it('rejects malformed data', () => {
    expect(errorsOf({ sounds: 'nope' }).length).toBeGreaterThan(0);
  });

  it('rejects a Level with fewer than 3 Games', () => {
    const c = tiny();
    c.worlds[0].levels[0].games.pop();
    expect(errorsOf(c).length).toBeGreaterThan(0);
  });

  it('rejects a word that is not Decodable at its Level', () => {
    const c = tiny();
    c.worlds[0].levels[0].games[2] = { kind: 'build-word', id: 'g3', words: ['am'] };
    expect(errorsOf(c).join()).toMatch(/am.*not decodable.*l1/);
  });

  it('rejects a word with a letter that is no Sound', () => {
    const c = tiny();
    c.words.push({ id: 'ax', text: 'ах', audio: 'w_am', approved: true });
    expect(errorsOf(c).join()).toMatch(/ax/);
  });

  it('rejects a Sound introduced twice and a Game on an untaught Sound', () => {
    const c = tiny();
    c.worlds[0].levels[1].newSound = 'a';
    expect(errorsOf(c).join()).toMatch(/introduced twice/);
    const d = tiny();
    d.worlds[0].levels[0].games[1] = { kind: 'trace', id: 'g2', sound: 'm' };
    expect(errorsOf(d).join()).toMatch(/m.*not taught/);
  });

  it('rejects unknown references and duplicate ids', () => {
    const c = tiny();
    c.worlds[0].levels[1].games[2] = { kind: 'build-word', id: 'g3', words: ['nope'] };
    expect(errorsOf(c).join()).toMatch(/nope/);
    const d = tiny();
    d.worlds[0].levels[1].id = 'l1';
    expect(errorsOf(d).join()).toMatch(/duplicate/i);
  });

  it('rejects a sort word that starts with neither Sound', () => {
    const c = tiny();
    c.worlds[0].levels[1].games[2] = { kind: 'sort', id: 'g3', sounds: ['a', 'm'], words: ['am', 'am'] };
    expect(validateCurriculum(c, dev).ok).toBe(true);
    c.worlds[0].levels[1].games[2] = { kind: 'sort', id: 'g3', sounds: ['m', 'aa'], words: ['am', 'am'] };
    expect(errorsOf(c).join()).toMatch(/am.*starts with/);
  });

  it('rejects a sort on two identical Sounds', () => {
    const c = tiny();
    c.worlds[0].levels[1].games[2] = { kind: 'sort', id: 'g3', sounds: ['m', 'm'], words: ['am', 'am'] };
    expect(errorsOf(c).join()).toMatch(/two different sounds/);
  });

  it('rejects a Level whose Sticker has no image', () => {
    expect(errorsOf(tiny(), { ...dev, images: new Set(['img_am', 'st_1']) }).join()).toMatch(/l2.*sticker.*st_2/);
  });

  it('reads a long vowel as one untaught Sound, so "маа" is not Decodable early', () => {
    const c = tiny();
    c.worlds[0].levels[1].games[2] = { kind: 'build-word', id: 'g3', words: ['maa'] };
    expect(errorsOf(c).join()).toMatch(/maa.*not decodable/);
  });

  it('rejects missing audio', () => {
    expect(errorsOf(tiny(), { ...dev, audio: new Set(['ph_a']) }).join()).toMatch(/ph_m/);
  });

  it('release: refuses unapproved words and pictureless words in picture Games', () => {
    const release = { ...dev, release: true };
    expect(errorsOf(tiny(), release).join()).toMatch(/maa.*not approved/);
    const c = tiny();
    c.words = c.words.filter((w) => w.approved);
    c.worlds[0].levels[1].games[2] = { kind: 'blend-pick', id: 'g3', words: ['am'] };
    expect(validateCurriculum(c, release).ok).toBe(true);
    delete c.words[0].image;
    expect(errorsOf(c, release).join()).toMatch(/am.*picture/);
  });
});
